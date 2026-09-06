#!/usr/bin/env bash
set -Eeuo pipefail
cd /home/levy/market013.app/folder_digital
for p in 1 2 3 4; do
  curl -s -A 'Mozilla/5.0' -L "https://d2q57q7k4hzryv.cloudfront.net/RPA/v3/171339/campanha-171339-cluster-739-pagina-${p}.jpeg" -o "_j2-${p}.jpg" -w "%{http_code} %{size_download}\n"
done
file _j2-*.jpg
