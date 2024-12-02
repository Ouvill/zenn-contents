.PHONY: docker run push

docker:
	docker build -t fastapi_sample .

run:
	docker run -it -p 8000:8000 --rm fastapi_sample

push:
	aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $(DOCKER_REPO)
	docker tag fastapi_sample:latest $(DOCKER_REPO)/fastapi_sample:latest
	docker push $(DOCKER_REPO)/fastapi_sample:latest
