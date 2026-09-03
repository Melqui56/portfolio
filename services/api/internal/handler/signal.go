package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/Melqui56/mqe/api/internal/store"
)

// signalRequest is the payload for POST /api/v1/signals.
// Type discriminates contact form (contact) vs studio inquiry (inquiry).
type signalRequest struct {
	Type       string `json:"type" binding:"required,oneof=contact inquiry"`
	Name       string `json:"name" binding:"required,min=2,max=100"`
	Email      string `json:"email" binding:"required,email,max=200"`
	Company    string `json:"company" binding:"omitempty,max=100"`
	Service    string `json:"service" binding:"omitempty,max=100"`
	Message    string `json:"message" binding:"required,min=10,max=5000"`
	SourcePage string `json:"source_page" binding:"omitempty,max=200"`
	Locale     string `json:"locale" binding:"omitempty,oneof=en es"`
}

// signalResponse is the API contract for a stored signal (avoids exposing pgtype).
type signalResponse struct {
	ID         int64  `json:"id"`
	Type       string `json:"type"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Message    string `json:"message"`
	SourcePage string `json:"source_page,omitempty"`
	Locale     string `json:"locale"`
	CreatedAt  string `json:"created_at"`
}

// toSignalResponse maps a store.Signal into the API contract type.
func toSignalResponse(s store.Signal) signalResponse {
	return signalResponse{
		ID:         s.ID,
		Type:       s.Type,
		Name:       s.Name,
		Email:      s.Email,
		Message:    s.Message,
		SourcePage: s.SourcePage.String,
		Locale:     s.Locale,
		CreatedAt:  s.CreatedAt.Time.String(),
	}
}

// createSignal godoc
// @Summary Submit a signal (contact or inquiry)
// @Description Receives a contact form submission (type=contact) or studio inquiry (type=inquiry), validates, and persists it.
// @Tags signals
// @Accept json
// @Produce json
// @Param signal body signalRequest true "Signal payload"
// @Success 201 {object} signalResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 429 {object} map[string]string
// @Router /api/v1/signals [post]
func (h *Handler) createSignal(c *gin.Context) {
	var req signalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		var verr validator.ValidationErrors
		if errors.As(err, &verr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "validation failed", "details": verr.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	q := store.New(h.pool)
	locale := req.Locale
	if locale == "" {
		locale = "en"
	}

	signal, err := q.CreateSignal(c.Request.Context(), store.CreateSignalParams{
		Type:       req.Type,
		Name:       req.Name,
		Email:      req.Email,
		Company:    text(req.Company),
		Service:    text(req.Service),
		Message:    req.Message,
		SourcePage: text(req.SourcePage),
		Locale:     locale,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store signal"})
		return
	}

	c.JSON(http.StatusCreated, toSignalResponse(signal))
}