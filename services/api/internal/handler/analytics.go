package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Melqui56/mqe/api/internal/store"
)

// analyticsSummary godoc
// @Summary Analytics summary (protected)
// @Description Returns aggregated visit and signal counts. Protected by basic auth.
// @Tags analytics
// @Produce json
// @Security BasicAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/v1/analytics/summary [get]
func (h *Handler) analyticsSummary(c *gin.Context) {
	// Basic auth protection — username/password from env.
	user := c.GetHeader("X-Analytics-User")
	pass := c.GetHeader("X-Analytics-Pass")
	if !h.checkAnalyticsAuth(user, pass) {
		c.Header("WWW-Authenticate", `Basic realm="mqe-analytics"`)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	q := store.New(h.pool)
	ctx := c.Request.Context()

	total, err := q.TotalVisits(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query analytics"})
		return
	}

	topPaths, err := q.VisitsByPath(ctx, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query analytics"})
		return
	}

	signals, err := q.CountSignalsByType(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query analytics"})
		return
	}

	byType := make(map[string]int64)
	for _, s := range signals {
		byType[s.Type] = s.Total
	}

	c.JSON(http.StatusOK, gin.H{
		"total_visits": total,
		"top_paths":    topPaths,
		"signals":      byType,
	})
}

// checkAnalyticsAuth validates the analytics credentials from env.
func (h *Handler) checkAnalyticsAuth(user, pass string) bool {
	u := h.cfg.AnalyticsUser
	p := h.cfg.AnalyticsPass
	if u == "" || p == "" {
		return false
	}
	return user == u && pass == p
}