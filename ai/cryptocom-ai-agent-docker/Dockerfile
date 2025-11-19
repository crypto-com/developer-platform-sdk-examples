# Official AWS Lambda base image for Python 3.12
FROM public.ecr.aws/lambda/python:3.12

# Copy requirements and install dependencies (if any)
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip3 install -r requirements.txt -t ${LAMBDA_TASK_ROOT}

# Copy function code
COPY handler.py ${LAMBDA_TASK_ROOT}/

# Set the handler (file.function)
CMD ["handler.lambda_handler"]
