package handler

import (
	"net"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// rateLimit is a simple per-IP sliding window limiter.
// max requests allowed within the window duration.
func (h *Handler) rateLimit(max int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := clientIP(c)
		now := time.Now()

		h.mu.Lock()
		// prune old timestamps outside the window
		cutoff := now.Add(-window)
		h.requests[ip] = prune(h.requests[ip], cutoff)
		if len(h.requests[ip]) >= max {
			h.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded, slow down captain",
			})
			return
		}
		h.requests[ip] = append(h.requests[ip], now)
		h.mu.Unlock()

		c.Next()
	}
}

// prune keeps only timestamps >= cutoff.
func prune(times []time.Time, cutoff time.Time) []time.Time {
	out := times[:0]
	for _, t := range times {
		if t.After(cutoff) || t.Equal(cutoff) {
			out = append(out, t)
		}
	}
	return out
}

// clientIP extracts the real client IP honoring X-Forwarded-For (set by Caddy).
func clientIP(c *gin.Context) string {
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		if ip, _, err := net.SplitHostPort(xff); err == nil {
			return ip
		}
		return xff
	}
	return c.ClientIP()
}