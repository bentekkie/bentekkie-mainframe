package auth

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestHashAndVerifyPassword(t *testing.T) {
	hash1, err := HashPassword("s3cr3t-pass!")
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	hash2, err := HashPassword("s3cr3t-pass!")
	if err != nil {
		t.Fatalf("HashPassword second call failed: %v", err)
	}
	if !IsHashedPassword(hash1) {
		t.Fatalf("expected hashed password prefix, got %q", hash1)
	}
	if hash1 == hash2 {
		t.Fatal("expected unique salts to produce distinct hashes")
	}
	if strings.Contains(hash1, "s3cr3t-pass!") {
		t.Fatal("hash must not contain plaintext password")
	}

	matched, needsRehash := VerifyPassword(hash1, "s3cr3t-pass!")
	if !matched || needsRehash {
		t.Fatalf("expected matched=true, needsRehash=false; got matched=%v needsRehash=%v", matched, needsRehash)
	}

	matched, needsRehash = VerifyPassword(hash1, "wrong-pass")
	if matched || needsRehash {
		t.Fatalf("expected matched=false, needsRehash=false for wrong password; got matched=%v needsRehash=%v", matched, needsRehash)
	}
}

func TestVerifyPasswordLegacyPlaintextUpgrade(t *testing.T) {
	matched, needsRehash := VerifyPassword("legacy-plain", "legacy-plain")
	if !matched || !needsRehash {
		t.Fatalf("expected legacy plaintext match to require rehash; got matched=%v needsRehash=%v", matched, needsRehash)
	}

	matched, needsRehash = VerifyPassword("legacy-plain", "wrong")
	if matched || needsRehash {
		t.Fatalf("expected legacy mismatch to fail; got matched=%v needsRehash=%v", matched, needsRehash)
	}

	matched, needsRehash = VerifyPassword("$pbkdf2-sha512$malformed", "anything")
	if matched || needsRehash {
		t.Fatalf("expected malformed hash to fail cleanly")
	}
}

func TestJWTSecretPersistenceAndUsernameClaim(t *testing.T) {
	t.Setenv("JWT_SECRET", "super-secret-signing-key-at-least-32-bytes-long")
	InitJWT()

	token, err := NewJWT("bentekkie")
	if err != nil {
		t.Fatalf("NewJWT failed: %v", err)
	}

	// Simulate process restart with the same JWT_SECRET.
	InitJWT()

	status, username, err := ParseJWT(token)
	if err != nil || status != VALID || username != "bentekkie" {
		t.Fatalf("expected (VALID, bentekkie, nil), got (%v, %q, %v)", status, username, err)
	}

	// Tampered token must fail.
	status, _, err = ParseJWT(token + "x")
	if err == nil || status != ERROR {
		t.Fatalf("expected tampered token to return ERROR, got (%v, %v)", status, err)
	}
}

func TestJWTFallbackRandomSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	InitJWT()

	token, err := NewJWT("admin")
	if err != nil {
		t.Fatalf("NewJWT failed: %v", err)
	}
	status, username, err := ParseJWT(token)
	if err != nil || status != VALID || username != "admin" {
		t.Fatalf("expected valid token with fallback secret, got (%v, %q, %v)", status, username, err)
	}
}

func TestLoginLimiterAndClientIPContext(t *testing.T) {
	ctx := WithClientIP(context.Background(), "203.0.113.10")
	if got := ClientIPFromContext(ctx); got != "203.0.113.10" {
		t.Fatalf("expected 203.0.113.10, got %q", got)
	}
	if got := ClientIPFromContext(context.Background()); got != "unknown" {
		t.Fatalf("expected unknown for missing IP, got %q", got)
	}

	now := time.Date(2026, 11, 24, 10, 0, 0, 0, time.UTC)
	limiter := NewLoginLimiter(3, 5*time.Minute)
	limiter.now = func() time.Time { return now }

	ip := "198.51.100.7"
	for i := 0; i < 3; i++ {
		if !limiter.Allow(ip) {
			t.Fatalf("expected attempt %d to be allowed", i+1)
		}
		limiter.RecordFailure(ip)
	}
	if limiter.Allow(ip) {
		t.Fatal("expected IP to be blocked after 3 failures")
	}
	if !limiter.Allow("198.51.100.8") {
		t.Fatal("expected different IP to remain allowed")
	}

	// Advancing past the window should expire previous failures.
	now = now.Add(6 * time.Minute)
	if !limiter.Allow(ip) {
		t.Fatal("expected IP to be allowed after window expiration")
	}

	// Reset clears failures immediately.
	limiter.RecordFailure(ip)
	limiter.RecordFailure(ip)
	limiter.RecordFailure(ip)
	if limiter.Allow(ip) {
		t.Fatal("expected IP blocked again")
	}
	limiter.Reset(ip)
	if !limiter.Allow(ip) {
		t.Fatal("expected Reset to unblock IP")
	}
}
