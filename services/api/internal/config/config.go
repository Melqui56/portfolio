package config

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds runtime configuration for the API.
type Config struct {
	Port          string
	DatabaseURL   string
	Env           string
	AllowedOrigin string
	AnalyticsUser string
	AnalyticsPass string
}

// Load reads configuration from environment variables with sensible dev defaults.
func Load() Config {
	return Config{
		Port:          getEnv("API_PORT", "8081"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://mqe:mqe_dev_password@localhost:5432/mqe?sslmode=disable"),
		Env:           getEnv("ENV", "development"),
		AllowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:4321"),
		AnalyticsUser: getEnv("ANALYTICS_USER", ""),
		AnalyticsPass: getEnv("ANALYTICS_PASS", ""),
	}
}

// NewPool creates a pgx connection pool with sensible defaults.
func (c Config) NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(c.DatabaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	log.Println("connected to postgres")
	return pool, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}