import os
from datetime import datetime
import pytz
from telegram import Update, User, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
import requests
import json
from urllib.parse import quote

# Get bot token from environment variable
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is not set!")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set!")

# Add context storage for each user
user_contexts = {}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle the /start command.

    Args:
        update (Update): The update object containing message data
        context (ContextTypes.DEFAULT_TYPE): The context object for the handler
    """
    await update.message.reply_text("Hi! I am a bot. Use /time to get current time.")


async def get_time(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send current local and UTC time when the command /time is issued."""
    # Get current time in UTC
    utc_time = datetime.now(pytz.UTC)

    # Get local time
    local_time = datetime.now()

    message = (
        f"🕒 Current time:\n\n"
        f"UTC: {utc_time.strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
        f"Local: {local_time.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    await update.message.reply_text(message)


async def debug_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Display detailed user and chat information for debugging purposes.

    Args:
        update (Update): The update object containing message data
        context (ContextTypes.DEFAULT_TYPE): The context object for the handler

    Returns:
        Sends a formatted message containing user ID, name, username, language,
        bot status, and chat ID.
    """
    user: User = update.effective_user

    debug_message = (
        f"🔍 Debug Information:\n\n"
        f"User ID: {user.id}\n"
        f"First Name: {user.first_name}\n"
        f"Last Name: {user.last_name if user.last_name else 'Not set'}\n"
        f"Username: {user.username if user.username else 'Not set'}\n"
        f"Language: {user.language_code if user.language_code else 'Not set'}\n"
        f"Is Bot: {user.is_bot}\n"
        f"Chat ID: {update.effective_chat.id}"
    )

    await update.message.reply_text(debug_message)


def shorten_link(url: str):
    """
    Shorten the given URL using TinyURL's API.

    Args:
        url (str): The original URL to be shortened

    Returns:
        str: The shortened URL if successful, otherwise returns the original URL
    """
    try:
        encoded_url = quote(url)
        response = requests.get(
            f"https://tinyurl.com/api-create.php?url={encoded_url}",
            timeout=5,  # Add timeout
        )
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException:
        return url


async def send_query(query: str, context: list = None):
    """
    Send a query to the AI Agent Service and get the response.

    Args:
        query (str): The user's query text to be processed
        context (list): Optional context from previous interactions

    Returns:
        dict: The JSON response from the AI service if successful, None otherwise
    """
    url = "http://localhost:8000/api/v1/cdc-ai-agent-service/query"

    payload = {
        "query": query,
        "options": {
            "openAI": {"apiKey": OPENAI_API_KEY},
            "context": context,
        },
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return None


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular text messages by processing them through the AI chat service."""
    message_text = update.message.text
    user_id = update.effective_user.id

    # Initialize context for new users
    if user_id not in user_contexts:
        user_contexts[user_id] = []

    # Send query to AI Agent Service with context
    response = await send_query(message_text, user_contexts[user_id])

    if response:
        # Update context if response has context
        if "context" in response:
            user_contexts[user_id].extend(response["context"])
            # Keep only the latest 10 context entries
            if len(user_contexts[user_id]) > 10:
                user_contexts[user_id] = user_contexts[user_id][-10:]

        if response.get("hasErrors"):
            await update.message.reply_text(
                "Sorry, there was an error processing your request."
            )
        else:
            # Process each result from the AI agent first
            for result in response.get("results", []):
                status = result.get("status", "No status")
                await update.message.reply_text(f"🤖 {status}")

                if "data" in result:
                    data = result["data"]
                    if isinstance(data, dict) and "magicLink" in data:
                        magic_link = data["magicLink"]
                        shortened_link = shorten_link(magic_link)
                        keyboard = [
                            [
                                InlineKeyboardButton(
                                    "Open Magic Link", url=shortened_link
                                )
                            ]
                        ]
                        reply_markup = InlineKeyboardMarkup(keyboard)
                        await update.message.reply_text(
                            "Transaction Ready! Click the button below to proceed:",
                            reply_markup=reply_markup,
                        )
                    else:
                        await update.message.reply_text(
                            "Data:\n" + json.dumps(data, indent=2)
                        )

            # Display finalResponse last
            if "finalResponse" in response:
                await update.message.reply_text(f"🤖 {response['finalResponse']}")
    else:
        await update.message.reply_text("Sorry, I couldn't connect to the AI service.")


def main():
    """
    Initialize and start the Telegram bot.

    Sets up command handlers and message handlers, then starts the bot
    with polling updates.

    Note:
        Requires BOT_TOKEN to be set in environment variables
    """
    # Create the Application and pass it your bot's token
    application = Application.builder().token(BOT_TOKEN).build()

    # Add command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("time", get_time))
    application.add_handler(CommandHandler("debug", debug_info))

    # Add message handler for regular text messages
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    # Start the Bot
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
