import instance from "../Utils/AxiosApi/Axios";

export const getChatAI = (data) => {
  return instance.post("/chat", data, {
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
};
