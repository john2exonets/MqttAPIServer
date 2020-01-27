VERSION=$(cat VERSION | perl -pe 's/^((\d+\.)*)(\d+)(.*)$/$1.($3+1).$4/e' | tee VERSION)
docker build -t jdallen/mqttapi:$VERSION -t jdallen/mqttapi:latest .

