package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Melqui56/mqe/api/internal/config"
)

// Handler holds dependencies for all HTTP handlers.
type Handler struct {
	cfg  config.Config
	pool *pgxpool.Pool

	// rate limiter state (simple per-IP token bucket)
	mu       sync.Mutex
	requests map[string][]time.Time
}

// New builds a Handler with the provided config and DB pool.
func New(cfg config.Config, pool *pgxpool.Pool) *Handler {
	return &Handler{
		cfg:      cfg,
		pool:     pool,
		requests: make(map[string][]time.Time),
	}
}

// text converts an optional string to pgtype.Text (nullable column).
func text(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

// Register wires all routes onto the gin engine.
func (h *Handler) Register(r *gin.Engine) {
	_ = r.SetTrustedProxies([]string{"127.0.0.1", "::1"})
	r.Use(h.corsMiddleware())

	v1 := r.Group("/api/v1")
	{
		v1.GET("/health", h.health)
		v1.GET("/ready", h.ready)

		signals := v1.Group("/signals")
		signals.Use(h.rateLimit(10, time.Minute))
		{
			signals.POST("", h.createSignal)
		}

		v1.POST("/visits", h.createVisit)
		v1.GET("/analytics/summary", h.analyticsSummary)
	}
}

// health godoc
// @Summary Health check
// @Description Returns service status — the "ship's status" endpoint.
// @Tags system
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/v1/health [get]
func (h *Handler) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "mqe-api",
	})
}

// ready godoc
// @Summary Readiness check
// @Description Returns process + DB reachability.
// @Tags system
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 503 {object} map[string]string
// @Router /api/v1/ready [get]
func (h *Handler) ready(c *gin.Context) {
	if h.pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db-unavailable"})
		return
	}
	ctx := c.Request.Context()
	if err := h.pool.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db-unreachable", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready", "service": "mqe-api"})
}

// corsMiddleware restricts cross-origin requests to the site origin.
func (h *Handler) corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && origin == h.cfg.AllowedOrigin {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Header("Vary", "Origin")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}