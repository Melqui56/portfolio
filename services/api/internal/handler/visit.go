package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/Melqui56/mqe/api/internal/store"
)

// visitRequest is the payload for POST /api/v1/visits.
type visitRequest struct {
	Path     string `json:"path" binding:"required,max=300"`
	Locale   string `json:"locale" binding:"omitempty,oneof=en es"`
	Referrer string `json:"referrer" binding:"omitempty,max=500"`
}

// visitResponse is the API contract for a stored visit.
type visitResponse struct {
	ID         int64  `json:"id"`
	Path       string `json:"path"`
	Locale     string `json:"locale"`
	Referrer   string `json:"referrer,omitempty"`
	UserAgent  string `json:"user_agent,omitempty"`
	VisitedAt  string `json:"visited_at"`
}

// toVisitResponse maps a store.Visit into the API contract type.
func toVisitResponse(v store.Visit) visitResponse {
	return visitResponse{
		ID:        v.ID,
		Path:      v.Path,
		Locale:    v.Locale,
		Referrer:  v.Referrer.String,
		UserAgent: v.UserAgent.String,
		VisitedAt: v.VisitedAt.Time.String(),
	}
}

// createVisit godoc
// @Summary Record a page visit
// @Description Silently records a page visit for self-hosted analytics.
// @Tags analytics
// @Accept json
// @Produce json
// @Param visit body visitRequest true "Visit payload"
// @Success 201 {object} visitResponse
// @Failure 400 {object} map[string]interface{}
// @Router /api/v1/visits [post]
func (h *Handler) createVisit(c *gin.Context) {
	var req visitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid visit payload"})
		return
	}

	locale := req.Locale
	if locale == "" {
		locale = "en"
	}

	q := store.New(h.pool)
	visit, err := q.CreateVisit(c.Request.Context(), store.CreateVisitParams{
		Path:      req.Path,
		Locale:    locale,
		Referrer:  text(req.Referrer),
		UserAgent: text(c.Request.UserAgent()),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store visit"})
		return
	}

	c.JSON(http.StatusCreated, toVisitResponse(visit))
}