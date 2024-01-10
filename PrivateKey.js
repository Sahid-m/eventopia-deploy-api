import dotenv from "dotenv";

dotenv.config();

export const PrivateKey = process.env.PRIVATE_KEY;
export const Port = process.env.PORT;
export const MongoDB_Url = process.env.MONGO_DB_URL;
