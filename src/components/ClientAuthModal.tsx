import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Phone, User, CheckCircle2, AlertCircle } from "lucide-react";
import { ClientUser } from "../types";
import { getStoredClientUsers, saveClientUsers } from "../data/storage";

interface ClientAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetUser: (user: ClientUser) => void;
}

export default function ClientAuthModal({
  isOpen,
  onClose,
  onSetUser,
}: ClientAuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  
  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const resetForm = () => {
    setName("");
    setPhone("");
    setNotification(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!name.trim()) {
      setNotification({ type: "error", message: "Por favor, digite seu nome." });
      return;
    }

    const cleanInputPhone = phone.replace(/\D/g, "");
    if (!cleanInputPhone) {
      setNotification({ type: "error", message: "Por favor, digite seu telefone." });
      return;
    }

    if (cleanInputPhone.length < 10) {
      setNotification({ type: "error", message: "Digite um número de telefone com DDD válido (Ex: 11999999999)." });
      return;
    }

    const users = getStoredClientUsers();
    const user = users.find(u => {
      const userPhoneDigits = u.phone.replace(/\D/g, "");
      return userPhoneDigits === cleanInputPhone;
    });

    if (!user) {
      setNotification({ type: "error", message: "Cadastro não encontrado com este número de telefone. Que tal criar uma conta?" });
      return;
    }

    if (user.blocked) {
      setNotification({ type: "error", message: "Acesso bloqueado pelo administrador. Fale conosco se precisar de ajuda!" });
      return;
    }

    // Normalized comparison of input name & stored name
    const normalizedInput = name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedStored = user.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const inputFirstName = normalizedInput.split(" ")[0];
    const storedFirstName = normalizedStored.split(" ")[0];

    if (inputFirstName !== storedFirstName && !normalizedStored.includes(normalizedInput) && !normalizedInput.includes(normalizedStored)) {
      setNotification({ type: "error", message: "O nome informado não bate com o cadastrado para este telefone." });
      return;
    }

    setNotification({ type: "success", message: `Acesso realizado! Seja bem-vindo de volta, ${user.name}!` });
    setTimeout(() => {
      onSetUser(user);
      resetForm();
      onClose();
    }, 1200);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!name.trim() || !phone.trim()) {
      setNotification({ type: "error", message: "Por favor, preencha todos os campos." });
      return;
    }

    const cleanPhoneDigits = phone.replace(/\D/g, "");
    if (cleanPhoneDigits.length < 10) {
      setNotification({ type: "error", message: "Por favor, insira o número de telefone com DDD válido (Ex: 11999999999)." });
      return;
    }

    const users = getStoredClientUsers();
    const phoneExists = users.some(u => u.phone.replace(/\D/g, "") === cleanPhoneDigits);

    if (phoneExists) {
      setNotification({ type: "error", message: "Este número de telefone já possui cadastro. Faça login!" });
      return;
    }

    // Clean generated referral code: First name in uppercase + 4 digits
    const cleanedName = name.trim().split(" ")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const cleanPrefix = cleanedName.slice(0, 5).replace(/[^A-Z]/g, "") || "ACAI";
    const refCode = `${cleanPrefix}${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: ClientUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      points: 0,
      createdAt: new Date().toISOString().split("T")[0],
      favorites: [],
      blocked: false,
      referralCode: refCode,
      referralAwarded: false,
    };

    saveClientUsers([...users, newUser]);

    setNotification({ type: "success", message: "Seu cadastro foi criado com sucesso! Entrando..." });

    setTimeout(() => {
      onSetUser(newUser);
      resetForm();
      setMode("login");
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => { resetForm(); onClose(); }}
            className="fixed inset-0 bg-black"
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-3xl w-full max-w-md max-h-[92dvh] overflow-y-auto shadow-2xl relative z-10 p-6 text-gray-900 border border-gray-100 scrollbar-thin"
          >
            {/* Top Close Button */}
            <button
              onClick={() => { resetForm(); onClose(); }}
              className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo/Identity */}
            <div className="text-center mb-6">
              <span className="text-3xl">🍇</span>
              <h2 className="font-sans font-black text-lg uppercase tracking-tight text-purple-900 mt-2">
                {mode === "login" ? "Acesse sua Conta" : "Cadastre-se Grátis"}
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-sans">
                {mode === "login"
                  ? "Entre utilizando seu nome e número de telefone cadastrados"
                  : "Crie sua conta para participar do Clube de Fidelidade e gerenciar seus pedidos"}
              </p>
            </div>

            {/* Error or Success notification */}
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl text-xs font-bold mb-4 flex items-start gap-2.5 font-sans ${
                  notification.type === "success"
                    ? "bg-lime-50 text-purple-950 border border-lime-250"
                    : "bg-red-50 text-red-900 border border-red-150"
                }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-lime-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{notification.message}</span>
              </motion.div>
            )}

            {/* Forms body */}
            <form
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 font-sans">Seu Nome Completo *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3.5 outline-none focus:border-purple-900 font-sans font-medium text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 font-sans">Número de Telefone com DDD *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 11999999999"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3 py-3.5 outline-none focus:border-purple-900 font-sans font-medium text-gray-900"
                  />
                </div>
              </div>

              {/* Form submit actions */}
              <button
                type="submit"
                className="w-full bg-purple-900 hover:bg-purple-950 text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase cursor-pointer transition-all mt-2 shadow-md shadow-purple-50 tracking-wider font-sans"
              >
                {mode === "login" ? "Entrar Grátis" : "Criar Meu Cadastro"}
              </button>

              {/* Modes redirection choices */}
              <div className="pt-3 border-t border-gray-100 text-center text-xs space-y-1 font-semibold font-sans text-gray-500">
                {mode === "login" ? (
                  <p>Não possui cadastro?{" "}
                    <button
                      type="button"
                      onClick={() => { setNotification(null); setMode("register"); }}
                      className="text-purple-900 font-black hover:underline cursor-pointer"
                    >
                      Cadastre-se agora
                    </button>
                  </p>
                ) : (
                  <p>Já possui cadastro?{" "}
                    <button
                      type="button"
                      onClick={() => { setNotification(null); setMode("login"); }}
                      className="text-purple-900 font-black hover:underline cursor-pointer"
                    >
                      Acesse sua conta
                    </button>
                  </p>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
