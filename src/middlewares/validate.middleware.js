// Wraps a zod schema; validates req.body by default.
// Usage: router.post("/register", validate(registerSchema), controller)
const validate =
  (schema, property = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join(".") || property,
        message: i.message,
      }));
      return res.status(400).json({ success: false, message: "Validation failed", errors: details });
    }
    req[property] = result.data;
    return next();
  };

module.exports = { validate };
