import os
from datetime import datetime
import pytz
from telegram import Update, User
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# Get bot token from environment variable
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is not set!")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a message when the command /start is issued."""
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
    """Display user information for debugging purposes."""
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


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular text messages."""
    message_text = update.message.text
    await update.message.reply_text(f"You said: {message_text}")


def main():
    """Start the bot."""
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
