package auth

import (
	"context"
	"sync"
	"time"
)

type clientIPContextKey struct{}

// WithClientIP stores the client's IP address on ctx for rate limiting.
func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, clientIPContextKey{}, ip)
}

// ClientIPFromContext retrieves the client IP stored by WithClientIP, defaulting to "unknown".
func ClientIPFromContext(ctx context.Context) string {
	if ip, ok := ctx.Value(clientIPContextKey{}).(string); ok && ip != "" {
		return ip
	}
	return "unknown"
}

// LoginLimiter enforces a sliding-window limit on failed login attempts per key (e.g. client IP).
type LoginLimiter struct {
	mu          sync.Mutex
	maxAttempts int
	window      time.Duration
	now         func() time.Time
	attempts    map[string][]time.Time
}

// NewLoginLimiter constructs a LoginLimiter allowing up to maxAttempts failures per window.
func NewLoginLimiter(maxAttempts int, window time.Duration) *LoginLimiter {
	if maxAttempts <= 0 {
		maxAttempts = 10
	}
	if window <= 0 {
		window = 5 * time.Minute
	}
	return &LoginLimiter{
		maxAttempts: maxAttempts,
		window:      window,
		now:         time.Now,
		attempts:    make(map[string][]time.Time),
	}
}

// Allow reports whether key is currently below the failed-attempt threshold.
func (l *LoginLimiter) Allow(key string) bool {
	if l == nil {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	kept := l.pruneKeyLocked(key, now)
	return len(kept) < l.maxAttempts
}

// RecordFailure records a failed authentication attempt for key.
func (l *LoginLimiter) RecordFailure(key string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	if len(l.attempts) > 1024 {
		l.pruneAllLocked(now)
	}
	kept := l.pruneKeyLocked(key, now)
	l.attempts[key] = append(kept, now)
}

// Reset clears recorded failures for key (called on successful login).
func (l *LoginLimiter) Reset(key string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, key)
}

func (l *LoginLimiter) pruneKeyLocked(key string, now time.Time) []time.Time {
	cutoff := now.Add(-l.window)
	existing := l.attempts[key]
	if len(existing) == 0 {
		return nil
	}
	kept := existing[:0]
	for _, ts := range existing {
		if ts.After(cutoff) {
			kept = append(kept, ts)
		}
	}
	if len(kept) == 0 {
		delete(l.attempts, key)
		return nil
	}
	l.attempts[key] = kept
	return kept
}

func (l *LoginLimiter) pruneAllLocked(now time.Time) {
	for k := range l.attempts {
		l.pruneKeyLocked(k, now)
	}
}
