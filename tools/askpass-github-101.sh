#!/bin/sh
case "$1" in
  *sername*) printf '%s\n' 'x-access-token' ;;
  *assword*) cat /home/user/tools/.token-github ;;
  *) exit 1 ;;
esac
