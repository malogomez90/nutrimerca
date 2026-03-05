import type { FoodRow } from "./csv-loader";

export type NutritionValidationResult = {
  compatibleFoods: FoodRow[];
  warnings: string[];
  errors: Array<{
    code: "NUTRITION_DATA_INVALID" | "RESTRICTION_CONFLICT";
    message: string;
  }>;
};

export function validateNutritionRules(
  foods: FoodRow[],
  restrictions: string[] = []
): NutritionValidationResult {
  const errors: NutritionValidationResult["errors"] = [];
  const warnings: string[] = [];

  const numericSafeFoods = foods.filter((food) => {
    const valid =
      Number.isFinite(food.kcal) &&
      Number.isFinite(food.proteinas) &&
      Number.isFinite(food.grasas) &&
      Number.isFinite(food.carbohidratos) &&
      food.kcal >= 0 &&
      food.proteinas >= 0 &&
      food.grasas >= 0 &&
      food.carbohidratos >= 0;

    if (!valid) {
      errors.push({
        code: "NUTRITION_DATA_INVALID",
        message: `Datos nutricionales inválidos detectados en alimento: ${food.nombre}`,
      });
    }

    return valid;
  });

  if (restrictions.length === 0) {
    return {
      compatibleFoods: numericSafeFoods,
      warnings,
      errors,
    };
  }

  const normalizedRestrictions = restrictions.map((r) => r.toLowerCase().trim());

  const compatibleFoods = numericSafeFoods.filter((food) => {
    if (!food.restricciones || food.restricciones.length === 0) return true;

    const foodRestrictions = food.restricciones.map((r) => r.toLowerCase().trim());
    return normalizedRestrictions.every((required) => foodRestrictions.includes(required));
  });

  if (compatibleFoods.length === 0) {
    errors.push({
      code: "RESTRICTION_CONFLICT",
      message: "No hay suficientes alimentos compatibles con las restricciones indicadas.",
    });
  } else if (compatibleFoods.length < 25) {
    warnings.push(
      "Hay pocos alimentos compatibles con tus restricciones. La variedad puede verse limitada."
    );
  }

  return {
    compatibleFoods,
    warnings,
    errors,
  };
}
