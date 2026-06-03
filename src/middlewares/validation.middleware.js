export const validate = (schema) => (req, res, next) => {

  const result = schema.safeParse(req.body);
  console.log(`Validation result: ${result}`);
  if (!result.success) {
    return res.status(400).json({
        status: false,
        result
    });
  }
  req.body = result.data;
  next();
};