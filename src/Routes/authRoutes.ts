import { Router } from "express";
import { signIn } from "../Controllers/AuthControllers/signIn";

const route = Router();

route.get('/auth', signIn);

export default route;