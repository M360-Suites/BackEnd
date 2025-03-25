import { Request, Response } from "express";

export const signIn = async (req:Request, res:Response):Promise<Response> => {
    try {
        console.log('Sign In Controller');
        return res.status(200).json({ message: 'Sign In Controller is working!' });
    } catch (error) {
        console.error('Error in signIn controller:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}