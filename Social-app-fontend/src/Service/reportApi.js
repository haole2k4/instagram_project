import instance from "../Utils/AxiosApi/Axios";

export const createReport = (payload) => {
  return instance.post("/reports", payload);
};
