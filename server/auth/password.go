package auth

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
)

const (
	pbkdf2Prefix = "$pbkdf2-sha512$"
	// DefaultPBKDF2Iterations follows OWASP PBKDF2-HMAC-SHA512 guidance (210,000+ iterations).
	DefaultPBKDF2Iterations = 210_000
	pbkdf2SaltLen           = 16
	pbkdf2KeyLen            = 32
)

// HashPassword hashes plaintext using PBKDF2-HMAC-SHA512 with a random salt.
func HashPassword(plaintext string) (string, error) {
	salt := make([]byte, pbkdf2SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}
	derived, err := pbkdf2.Key(sha512.New, plaintext, salt, DefaultPBKDF2Iterations, pbkdf2KeyLen)
	if err != nil {
		return "", fmt.Errorf("derive password key: %w", err)
	}
	return fmt.Sprintf(
		"%s%d$%s$%s",
		pbkdf2Prefix,
		DefaultPBKDF2Iterations,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(derived),
	), nil
}

// IsHashedPassword reports whether stored uses the PBKDF2-HMAC-SHA512 encoded format.
func IsHashedPassword(stored string) bool {
	return strings.HasPrefix(stored, pbkdf2Prefix)
}

// VerifyPassword checks candidate against stored.
// For backward compatibility with pre-existing plaintext rows on existing deployments,
// non-hashed stored values are compared in constant time and flagged with needsRehash=true on match.
func VerifyPassword(stored, candidate string) (matched bool, needsRehash bool) {
	if stored == "" {
		return false, false
	}
	if !IsHashedPassword(stored) {
		ok := subtle.ConstantTimeCompare([]byte(stored), []byte(candidate)) == 1
		return ok, ok
	}

	rest := strings.TrimPrefix(stored, pbkdf2Prefix)
	parts := strings.Split(rest, "$")
	if len(parts) != 3 {
		return false, false
	}
	iterations, err := strconv.Atoi(parts[0])
	if err != nil || iterations <= 0 {
		return false, false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil || len(salt) == 0 {
		return false, false
	}
	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil || len(expectedHash) == 0 {
		return false, false
	}

	derived, err := pbkdf2.Key(sha512.New, candidate, salt, iterations, len(expectedHash))
	if err != nil {
		return false, false
	}
	if subtle.ConstantTimeCompare(derived, expectedHash) != 1 {
		return false, false
	}
	return true, iterations < DefaultPBKDF2Iterations
}
