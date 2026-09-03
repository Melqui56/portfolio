-- name: CreateSignal :one
INSERT INTO signals (type, name, email, company, service, message, source_page, locale)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, type, name, email, company, service, message, source_page, locale, created_at;

-- name: ListSignals :many
SELECT id, type, name, email, company, service, message, source_page, locale, created_at
FROM signals
ORDER BY created_at DESC;

-- name: CreateVisit :one
INSERT INTO visits (path, locale, referrer, user_agent)
VALUES ($1, $2, $3, $4)
RETURNING id, path, locale, referrer, user_agent, visited_at;

-- name: CountSignalsByType :many
SELECT type, COUNT(*) AS total
FROM signals
GROUP BY type;

-- name: VisitsByPath :many
SELECT path, COUNT(*) AS total
FROM visits
GROUP BY path
ORDER BY total DESC
LIMIT $1;

-- name: TotalVisits :one
SELECT COUNT(*) AS total
FROM visits;