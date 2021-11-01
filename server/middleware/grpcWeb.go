package middleware

import (
	"context"
	"net/http"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
)

//GrpcWebMiddleware defines a middleware
type GrpcWebMiddleware struct {
	*grpcweb.WrappedGrpcServer
}

type key int

const (
	//URLContextKey is the key for the url
	URLContextKey key = iota
)

//Handler handles http requests for the middleware
func (m *GrpcWebMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m.IsAcceptableGrpcCorsRequest(r) || m.IsGrpcWebRequest(r) {
			ctx := context.WithValue(r.Context(), URLContextKey, r.Referer())
			m.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		next.ServeHTTP(w, r)
	})
}

//NewGrpcWebMiddleware creates new middleware for grpc server
func NewGrpcWebMiddleware(grpcWeb *grpcweb.WrappedGrpcServer) *GrpcWebMiddleware {
	return &GrpcWebMiddleware{grpcWeb}
}
