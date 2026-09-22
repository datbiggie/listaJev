declare module "ai" {
  export interface EvaluateQuestion {
    type: "boolean" | "number" | "string";
    instructions: string;
  }

  export interface EvaluateOptions {
    model: string;
    state: string;
    questions: Record<string, EvaluateQuestion>;
  }

  export function experimental_evaluate(
    options: EvaluateOptions
  ): Promise<Record<string, unknown>>;
}
