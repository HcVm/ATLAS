"use client"
import * as z from "zod"
import RegisterForm from "./register-form"

const formSchema = z
  .object({
    email: z.string().email({ message: "Debe ser un correo electrónico válido." }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
    confirmPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
    full_name: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <RegisterForm />
    </div>
  )
}
