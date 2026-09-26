export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function requireValue(value,name){if(!value)throw new AppError(name+' is not configured on the server.',503);return value;}
