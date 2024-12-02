FROM public.ecr.aws/docker/library/python:3.12-slim
# Expose the port the app runs on
ENV PORT=8000
ENV XDG_CACHE_HOME=/tmp/.cache

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

# Copy the project into the image
ADD . /app

# Sync the project into a new environment, using the frozen lockfile
WORKDIR /app
RUN uv sync --frozen

# Command to run the application
CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT}
