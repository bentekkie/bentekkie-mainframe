package env

import (
	"errors"
	"os"
	"strconv"
)

var errEnvVarEmpty = errors.New("getenv: environment variable empty")

func GetEnvStr(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return v, errEnvVarEmpty
	}
	return v, nil
}

func GetEnvBool(key string) (bool, error) {
	s, err := GetEnvStr(key)
	if err != nil {
		return false, err
	}
	v, err := strconv.ParseBool(s)
	if err != nil {
		return false, err
	}
	return v, nil
}
