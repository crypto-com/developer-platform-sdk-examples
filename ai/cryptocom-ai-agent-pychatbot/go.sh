if [ -z "$OPENAI_API_KEY" ]; then
  echo "OPENAI_API_KEY environment variable is not set. Please set it before running the script."
  exit 1
else
  echo "OPENAI_API_KEY is set successfully"
fi

python chat.py