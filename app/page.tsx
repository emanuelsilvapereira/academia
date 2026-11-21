import { redirect } from "next/navigation";

export default function Inicio() {
  // A página /painel confere o login e manda para /login se for preciso.
  redirect("/painel");
}
