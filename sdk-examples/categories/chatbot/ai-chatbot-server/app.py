from flask import Flask, request, jsonify
from flask_cors import CORS
from crypto_com_agent_client import Agent, SQLitePlugin, tool
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[os.getenv("AI_CHATBOT_APP_URL")])


storage = SQLitePlugin(db_path="agent.db")
agent = Agent.init(
    llm_config={
        "provider": "OpenAI",
        "model": "gpt-4o-mini",
        "provider-api-key": os.getenv("OPENAI_API_KEY"),
    },
    blockchain_config={
        "api-key": os.getenv("SDK_API_KEY"),
        "private-key": os.getenv("PRIVATE_KEY"),
        "sso-wallet-url": "your-sso-wallet-url",
    },
    plugins={"storage": storage},
)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    thread = data.get("thread", [])
    user_msg = data["message"]
    thread.append({"role": "user", "content": user_msg})
    resp = agent.interact(user_msg)
    thread.append({"role": "assistant", "content": resp})
    return jsonify({"reply": resp, "thread": thread})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
