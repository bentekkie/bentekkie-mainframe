package auth

import (
	"fmt"
	"github.com/bentekkie/bentekkie-mainframe/server/env"
	"github.com/dgrijalva/jwt-go"
	"time"
)

type CustomClaims struct {
	Username string `json:"username"`
	jwt.StandardClaims
}

type Status int

const (
	VALID Status = iota
	EXPIRED
	INVALID
	ERROR
)


var JWTSecret, _ = env.GetEnvStr("JWT")


func NewJWT(username string) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, CustomClaims{
		username,
		jwt.StandardClaims{
				Issuer:"bentekkie-mainframe",
				ExpiresAt: now.Unix() + int64(time.Duration(time.Hour*24).Seconds()),
		},
	})
	return token.SignedString([]byte(JWTSecret))
}

func ParseJWT(jwtString string) (Status, error) {
	token, err := jwt.ParseWithClaims(jwtString,&CustomClaims{},func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return []byte(JWTSecret), nil
	})
	if err != nil {
		return ERROR, err
	}
	now := time.Now()
	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		if now.Add(time.Minute*2).Before(time.Unix(claims.ExpiresAt,0)) {
			return VALID, nil
		}
		return EXPIRED, nil
	} else {
		return INVALID, err
	}

}
