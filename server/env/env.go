package env

import (
	"errors"
	"os"
	"strconv"
)

var errEnvVarEmpty = errors.New("getenv: environment variable empty")

//GetEnvStr gets an environment variable as a string
func GetEnvStr(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return v, errEnvVarEmpty
	}
	return v, nil
}

//GetEnvBool gets an environment variable as a boolean
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

//GetEnvInt gets an environment variable as an integer
func GetEnvInt(key string) (int, error) {
	s, err := GetEnvStr(key)
	if err != nil {
		return 0, err
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return 0, err
	}
	return v, nil

}
