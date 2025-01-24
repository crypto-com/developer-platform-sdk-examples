import { Message } from "../components/Chatbot/interfaces";
import { format, isToday } from "date-fns";

export const getChatStartDate = (messages: Message[]) => {
  if (messages.length === 0) return "";
  const startDate = messages[0].timestamp;

  if (isToday(new Date(startDate))) {
    return "Today";
  }

  return format(new Date(startDate), "PP");
};
