package auth

import (
	"crypto/rand"
	"fmt"
	"os"
	"sync"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	log "github.com/sirupsen/logrus"
)

type customClaims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Status of JWT token
type Status int

// Statuses for JWT tokens
const (
	VALID Status = iota
	EXPIRED
	INVALID
	ERROR
)

var (
	keyMu sync.RWMutex
	key   []byte
)

// InitJWT configures the HMAC signing key from JWT_SECRET when set, or generates an
// ephemeral 64-byte cryptographically random key otherwise (backward-compatible with prod.env).
func InitJWT() {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		if len(secret) < 32 {
			log.Warn("JWT_SECRET is shorter than 32 bytes; consider using a longer random secret")
		}
		keyMu.Lock()
		key = []byte(secret)
		keyMu.Unlock()
		return
	}

	randomKey := make([]byte, 64)
	if _, err := rand.Read(randomKey); err != nil {
		log.WithError(err).Fatal("Failed to generate random JWT signing key")
	}
	log.Warn("JWT_SECRET not set; using ephemeral random signing key (sessions will reset on restart)")
	keyMu.Lock()
	key = randomKey
	keyMu.Unlock()
}

func signingKey() ([]byte, error) {
	keyMu.RLock()
	k := key
	keyMu.RUnlock()
	if len(k) == 0 {
		return nil, fmt.Errorf("JWT signing key not initialized")
	}
	return k, nil
}

// NewJWT creates a new JWT token for username.
func NewJWT(username string) (string, error) {
	k, err := signingKey()
	if err != nil {
		return "", err
	}
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, customClaims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "bentekkie-mainframe",
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour * 24)),
		},
	})
	return token.SignedString(k)
}

// ParseJWT validates a JWT token and returns its status and authenticated username.
func ParseJWT(jwtString string) (Status, string, error) {
	k, err := signingKey()
	if err != nil {
		return ERROR, "", err
	}
	token, err := jwt.ParseWithClaims(jwtString, &customClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return k, nil
	})
	if err != nil {
		return ERROR, "", err
	}
	now := time.Now()
	if claims, ok := token.Claims.(*customClaims); ok && token.Valid {
		if claims.Username == "" || claims.ExpiresAt == nil {
			return INVALID, "", nil
		}
		if now.Add(time.Minute * 2).Before(claims.ExpiresAt.Time) {
			return VALID, claims.Username, nil
		}
		return EXPIRED, claims.Username, nil
	}
	return INVALID, "", err
}
