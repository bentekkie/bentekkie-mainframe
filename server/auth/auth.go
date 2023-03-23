package auth

import (
	"crypto/rand"
	"fmt"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
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

var key = make([]byte, 64)

func InitJWT() {
	rand.Read(key)
}

// NewJWT creates a new JWT token
func NewJWT(username string) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, customClaims{
		username,
		jwt.RegisteredClaims{
			Issuer:    "bentekkie-mainframe",
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour * 24)),
		},
	})
	return token.SignedString(key)
}

// ParseJWT parses a JWT token
func ParseJWT(jwtString string) (Status, error) {
	token, err := jwt.ParseWithClaims(jwtString, &customClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return key, nil
	})
	if err != nil {
		return ERROR, err
	}
	now := time.Now()
	if claims, ok := token.Claims.(*customClaims); ok && token.Valid {
		if now.Add(time.Minute * 2).Before(claims.ExpiresAt.Time) {
			return VALID, nil
		}
		return EXPIRED, nil
	}
	return INVALID, err
}
