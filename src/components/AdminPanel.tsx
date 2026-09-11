import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Lock, Mail, Key, ShieldCheck, LogOut, ChevronRight, Edit3, Trash2, Plus, Save, Upload,
  Building2, ShoppingBag, Image, MessageSquare, Award, Tag, Smartphone, MapPin, Eye, EyeOff, Star, User, UserX, UserCheck,
  TrendingUp, Calendar, DollarSign, ShoppingCart, Download, CheckCircle, MessageCircle, Search, Sparkles
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { Product, VitrineItem, SocialProof, PromoWeekDay, CompanyInfo, LoyaltyUser, ClientUser, OrderHistory, DEFAULT_AVATAR_URL, DailyHour, WeeklyHours } from "../types";
import { getStoredClientUsers, saveClientUsers, fetchAdminCredentialsCloud, saveAdminCredentialsCloud } from "../data/storage";
import { compressImageBase64, uploadImageToStorage } from "../lib/firebase";

interface ImageSelectorProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  presetType?: "product" | "banner" | "avatar" | "logo";
}

function ImageSelector({ label, value, onChange, presetType = "product" }: ImageSelectorProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUploadFile(file);
  };

  const processAndUploadFile = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === "string") {
          try {
            // 1. Compress the image
            const compressed = await compressImageBase64(reader.result);
            // 2. Upload directly to Cloudinary
            try {
              const downloadURL = await uploadImageToStorage(compressed);
              onChange(downloadURL);
            } catch (cloudErr) {
              console.warn("[Cloudinary] Upload failed, using optimized local base64 fallback:", cloudErr);
              onChange(compressed); // Fallback to storing compressed base64 directly
            }
          } catch (error) {
            console.error("Erro ao processar imagem:", error);
            alert("Falha ao processar a imagem. Por favor, tente novamente.");
          } finally {
            setUploading(false);
          }
        } else {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processAndUploadFile(file);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
      <div>
        <label className="text-xs font-bold text-gray-800 block mb-1">
          {label}
        </label>
        <p className="text-[10px] text-gray-400">
          Faça upload de uma imagem do seu dispositivo. Armazenamento em nuvem via Cloudinary.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
          dragOver 
            ? "border-brand-purple bg-purple-50/40" 
            : "border-gray-200 hover:border-brand-purple/50 bg-gray-50/50"
        }`}
      >
        {uploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-purple-950 animate-pulse">Enviando para o Cloudinary...</span>
          </div>
        ) : value ? (
          <div className="w-full flex flex-col items-center space-y-3">
            {/* Image Preview Container */}
            <div className={`relative bg-white border border-gray-100 shadow-2xs overflow-hidden ${
              presetType === "logo" ? "w-20 h-20 rounded-full" : "w-full max-w-xs h-32 rounded-xl"
            }`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=400&q=80";
                }}
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                Nuvem Ativa
              </div>
            </div>

            {/* URL/Cloud ID display */}
            <div className="w-full bg-gray-100/70 p-2 rounded-lg border border-gray-200 text-center">
              <span className="text-[9px] text-gray-500 font-mono block truncate select-all px-1">
                {value}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full justify-center">
              <label className="px-3.5 py-2 bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Substituir Imagem</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => onChange("")}
                className="px-3.5 py-2 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-600 hover:text-red-600 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <label className="w-full py-8 flex flex-col items-center justify-center cursor-pointer space-y-2 select-none group">
            <div className="w-12 h-12 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-brand-purple transition-all shadow-2xs">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1 px-4">
              <span className="text-xs font-bold text-gray-700 block group-hover:text-brand-purple transition-colors">
                Clique para enviar ou arraste a imagem aqui
              </span>
              <span className="text-[10px] text-gray-400 block">
                Formatos suportados: PNG, JPG, WEBP de até 5MB
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}

interface AdminPanelProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  vitrine: VitrineItem[];
  onUpdateVitrine: (vitrine: VitrineItem[]) => void;
  socialProofs: SocialProof[];
  onUpdateSocialProofs: (proofs: SocialProof[]) => void;
  promos: PromoWeekDay[];
  onUpdatePromos: (promos: PromoWeekDay[]) => void;
  companyInfo: CompanyInfo;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
  loyaltyUsers: LoyaltyUser[];
  onUpdateLoyaltyPoints: (phone: string, pointsChange: number) => void;
  onRegisterLoyaltyUser: (name: string, phone: string, points?: number) => void;
  onDeleteLoyaltyUser?: (phone: string) => void;
  orders?: OrderHistory[];
  onUpdateOrderStatus?: (orderId: string, status: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado") => void;
  onAddGlobalNotification?: (message: string, status?: "Recebido" | "Em preparo" | "Saiu para entrega" | "Entregue" | "Cancelado" | "Promoção" | "Geral") => void;
  onConfirmWhatsAppPurchase?: (orderId: string) => void;
}

export default function AdminPanel({
  products,
  onUpdateProducts,
  vitrine,
  onUpdateVitrine,
  socialProofs,
  onUpdateSocialProofs,
  promos,
  onUpdatePromos,
  companyInfo,
  onUpdateCompanyInfo,
  loyaltyUsers,
  onUpdateLoyaltyPoints,
  onRegisterLoyaltyUser,
  onDeleteLoyaltyUser,
  orders = [],
  onUpdateOrderStatus,
  onAddGlobalNotification,
  onConfirmWhatsAppPurchase,
}: AdminPanelProps) {
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem("acai_admin_email") || "admin@acai.com");
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem("acai_admin_password") || "admin123");
  const [newAdminEmail, setNewAdminEmail] = useState(() => localStorage.getItem("acai_admin_email") || "admin@acai.com");
  const [newAdminPassword, setNewAdminPassword] = useState(() => localStorage.getItem("acai_admin_password") || "admin123");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState<"company" | "products" | "vitrine" | "proofs" | "promos" | "loyalty" | "clients" | "settings" | "vendas" | "vendas_whatsapp" | "incentivo_fidelidade">("vendas_whatsapp");
  const [clientUsers, setClientUsers] = useState<ClientUser[]>(() => getStoredClientUsers());
  const [whatsappFilter, setWhatsappFilter] = useState<"pending" | "confirmed" | "canceled">("pending");
  const [salesSearchQuery, setSalesSearchQuery] = useState("");
  const [loyaltySearchQuery, setLoyaltySearchQuery] = useState("");
  const [loyaltyFilter, setLoyaltyFilter] = useState<"all" | "ready" | "near" | "manual" | "app">("all");
  const [editingClient, setEditingClient] = useState<ClientUser | null>(null);
  const [incentivePointsThreshold, setIncentivePointsThreshold] = useState<number>(30);
  const [newToppingInput, setNewToppingInput] = useState("");

  // Automatically synchronize local client list state whenever orders or loyalty users list updates in parent App
  useEffect(() => {
    setClientUsers(getStoredClientUsers());
  }, [orders, loyaltyUsers]);

  // Load admin credentials from Firestore on mount
  useEffect(() => {
    fetchAdminCredentialsCloud().then((data) => {
      if (data.email) {
        setAdminEmail(data.email);
        setNewAdminEmail(data.email);
      }
      if (data.password) {
        setAdminPassword(data.password);
        setNewAdminPassword(data.password);
      }
    });
  }, []);

  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [blockingClientId, setBlockingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingLoyaltyPhone, setDeletingLoyaltyPhone] = useState<string | null>(null);
  const [confirmingResgateId, setConfirmingResgateId] = useState<string | null>(null);

  // Helper inside AdminPanel to update loyalty points and keep local clientUser database state synchronized dynamically
  const handleAdjustPoints = (phone: string, pointsChange: number) => {
    // 1. Call parent state update handler (which updates points in App and in IndexedDB/Storage)
    onUpdateLoyaltyPoints(phone, pointsChange);

    // 2. Keep local clientUsers state updated in real-time
    const cleanPhone = phone.replace(/\D/g, "");
    const target = companyInfo.loyaltyPointsTarget || 100;
    const isRedemption = pointsChange < 0 && Math.abs(pointsChange) >= target;

    setClientUsers((prevClients) => {
      return prevClients.map((u) => {
        if (u.phone.replace(/\D/g, "") === cleanPhone) {
          return {
            ...u,
            points: isRedemption ? 0 : Math.max(0, (u.points || 0) + pointsChange)
          };
        }
        return u;
      });
    });
  };

  // --- EXPORT ORDERS HISTORY TO PDF (ACCOUNTING REPORT) ---
  const exportToPDF = () => {
    try {
      const doc = new jsPDF() as any;
      const shopName = companyInfo?.name || "Açaíteria";
      const reportDate = new Date().toLocaleDateString("pt-BR");
      const reportTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const primaryColor = [88, 28, 135]; // Deep Purple: #581c87
      const secondaryColor = [126, 34, 206]; // Purple: #7e22ce
      const darkTextColor = [31, 41, 55]; // Charcoal
      const greyTextColor = [107, 114, 128]; // Grey

      // Banner topo elegante
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 42, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(shopName.toUpperCase(), 15, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(233, 213, 255);
      doc.text(`Relatório de Contabilidade Diária & Fechamento de Caixa  |  Gerado em: ${reportDate} às ${reportTime}`, 15, 26);
      doc.text(`Endereço da Loja: ${companyInfo?.address || "Não informado na plataforma"}`, 15, 32);
      doc.text(`WhatsApp: ${companyInfo?.whatsapp || "Não informado"}  |  Instagram: @${companyInfo?.instagram || "nao_informado"}`, 15, 37);

      // Métricas de faturamento reais/demonstração
      const orderList = orders || [];
      const activeOrders = orderList.filter(o => o.status === "Finalizado");
      const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalCount = activeOrders.length;
      const ticketMedio = totalCount > 0 ? totalRevenue / totalCount : 0;

      // Splits por pagamento (excluindo cancelados)
      const payPix = activeOrders.filter(o => o.paymentMethod === "Pix").reduce((sum, o) => sum + (o.total || 0), 0);
      const payMoney = activeOrders.filter(o => o.paymentMethod === "Dinheiro").reduce((sum, o) => sum + (o.total || 0), 0);
      const payCard = activeOrders.filter(o => {
        const method = (o.paymentMethod || "").toLowerCase();
        return method.includes("cart") || method.includes("créd") || method.includes("déb") || method.includes("visa") || method.includes("master") || method.includes("elo") || method.includes("card");
      }).reduce((sum, o) => sum + (o.total || 0), 0);
      const payOther = Math.max(0, totalRevenue - (payPix + payMoney + payCard));

      // Secção 1: Resumo do Faturamento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("1. RESUMO GERAL DAS VENDAS (CONTABILIDADE BRUTA)", 15, 52);

      // Caixa de KPI 1: Faturamento Geral
      doc.setDrawColor(243, 244, 246);
      doc.setFillColor(249, 250, 251);
      doc.rect(15, 57, 56, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(greyTextColor[0], greyTextColor[1], greyTextColor[2]);
      doc.text("FATURAMENTO BRUTO", 18, 63);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18, 73);

      // Caixa de KPI 2: Pedidos Confirmados
      doc.setFillColor(249, 250, 251);
      doc.rect(77, 57, 56, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(greyTextColor[0], greyTextColor[1], greyTextColor[2]);
      doc.text("PEDIDOS PROCESSADOS", 80, 63);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(`${totalCount} confirmados`, 80, 73);

      // Caixa de KPI 3: Ticket Médio
      doc.setFillColor(249, 250, 251);
      doc.rect(139, 57, 56, 24, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(greyTextColor[0], greyTextColor[1], greyTextColor[2]);
      doc.text("TICKET MÉDIO", 142, 63);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 142, 73);

      // Status do dia
      const statusCounts = orderList.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statsText = `Status dos Pedidos do Dia:  |  ` + 
        `Recebidos: ${statusCounts["Recebido"] || 0}  |  ` + 
        `Em Preparo: ${statusCounts["Em preparo"] || 0}  |  ` + 
        `A Caminho: ${statusCounts["Saiu para entrega"] || 0}  |  ` + 
        `Entregues: ${statusCounts["Entregue"] || 0}  |  ` + 
        `Cancelados: ${statusCounts["Cancelado"] || 0}`;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(greyTextColor[0], greyTextColor[1], greyTextColor[2]);
      doc.text(statsText, 15, 87);

      // Secção 2: Fluxo de Caixa / Meios de Pagamento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("2. MEIOS DE RECONCILIAÇÃO DE PAGAMENTO", 15, 98);

      const percent = (val: number) => totalRevenue > 0 ? ((val / totalRevenue) * 105).toFixed(1).replace(".", ",") + "%" : "0,0%";

      const paymentData = [
        ["PIX (Transferência Instantânea)", `R$ ${payPix.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, totalRevenue > 0 ? ((payPix / totalRevenue) * 100).toFixed(1).replace(".", ",") + "%" : "0,0%"],
        ["Cartões (Crédito / Débito)", `R$ ${payCard.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, totalRevenue > 0 ? ((payCard / totalRevenue) * 100).toFixed(1).replace(".", ",") + "%" : "0,0%"],
        ["Dinheiro em Espécie (Físico)", `R$ ${payMoney.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, totalRevenue > 0 ? ((payMoney / totalRevenue) * 100).toFixed(1).replace(".", ",") + "%" : "0,0%"],
        ["Outros / Integrados", `R$ ${payOther.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, totalRevenue > 0 ? ((payOther / totalRevenue) * 100).toFixed(1).replace(".", ",") + "%" : "0,0%"],
        ["TOTAL ACUMULADO REAL DO DIA", `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "100,0%"]
      ];

      doc.autoTable({
        startY: 102,
        head: [["Meio de Pagamento", "Faturamento Acumulado (R$)", "Percentual das Vendas"]],
        body: paymentData,
        theme: "striped",
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          1: { halign: "right", fontStyle: "bold" },
          2: { halign: "center", fontStyle: "bold" }
        },
        margin: { left: 15, right: 15 },
        didParseCell: (data: any) => {
          if (data.row.index === 4 && data.cell.section === "body") {
            data.cell.styles.fillColor = [243, 232, 255]; // lilás claro
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = primaryColor;
          }
        }
      });

      const nextY = (doc as any).lastAutoTable.finalY + 12;

      // Secção 3: Detalhamento dos Pedidos
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("3. LIVRO DE REGISTROS DE PEDIDOS INDIVIDUAIS", 15, nextY);

      const orderRows = orderList.map((o) => {
        const oDate = o.date ? new Date(o.date) : new Date();
        const dateFormatted = `${oDate.toLocaleDateString("pt-BR")} ${oDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        const itemsText = o.items ? o.items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(", ") : "Açaí";
        
        return [
          o.id || "-",
          dateFormatted,
          o.customerName || "Anônimo",
          itemsText,
          o.paymentMethod || "Pix",
          o.status,
          `R$ ${(o.total || 0).toFixed(2)}`
        ];
      });

      doc.autoTable({
        startY: nextY + 4,
        head: [["Código", "Data/Hora", "Cliente", "Itens do Pedido", "Pagamento", "Status", "Total"]],
        body: orderRows.length > 0 ? orderRows : [["-", "Sem pedidos cadastrados no sistema.", "-", "-", "-", "-", "R$ 0,00"]],
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 15, fontStyle: "bold", textColor: primaryColor },
          1: { cellWidth: 25 },
          2: { cellWidth: 22 },
          3: { cellWidth: 58 },
          4: { cellWidth: 16 },
          5: { cellWidth: 22 },
          6: { cellWidth: 22, halign: "right", fontStyle: "bold" }
        },
        margin: { left: 15, right: 15 },
        didParseCell: (data: any) => {
          if (data.column.index === 5 && data.cell.section === "body") {
            const status = data.cell.raw;
            if (status === "Cancelado") {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fillColor = [254, 242, 242];
            } else if (status === "Entregue") {
              data.cell.styles.textColor = [4, 120, 87];
              data.cell.styles.fillColor = [236, 253, 245];
            } else if (status === "Em preparo" || status === "Recebido" || status === "Saiu para entrega") {
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fillColor = [254, 243, 199];
            }
          }
        }
      });

      // Assinatura de fecho
      const lastY = (doc as any).lastAutoTable.finalY + 12;
      if (lastY < 270) {
        doc.setDrawColor(229, 231, 235);
        doc.line(15, lastY + 8, 85, lastY + 8);
        doc.line(125, lastY + 8, 195, lastY + 8);
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(greyTextColor[0], greyTextColor[1], greyTextColor[2]);
        doc.text("Assinatura do Responsável da Caixa", 15, lastY + 12);
        doc.text("Assinatura do Gerente Geral", 125, lastY + 12);
      }

      // Adicionar paginação e rodapés
      const totalPages = doc.internal.getNumberOfPages();
      for (let idx = 1; idx <= totalPages; idx++) {
        doc.setPage(idx);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(156, 163, 175);
        doc.text(`Documento de Uso Geral e Interno  |  Açaíteria Premium: ${shopName}`, 15, 290);
        doc.text(`Página ${idx} de ${totalPages}`, 175, 290);
      }

      const safeStoreName = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const dateStringFilename = reportDate.replace(/\//g, "-");
      doc.save(`fechamento_contabil_${safeStoreName}_${dateStringFilename}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Houve um erro técnico ao gerar o fechamento em PDF. Por favor tente novamente!");
    }
  };

  // --- AUTOMATIC MARKETING CAMPAIGNS & PROMOTION DISPATCH ---
  const [promoMessage, setPromoMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<"current_day" | "all_promos" | "loyalty" | "loyalty_incentive" | "birthday" | "custom">("custom");
  const [campaignLogs, setCampaignLogs] = useState<{ time: string; text: string; type: "info" | "success" | "error" | "whatsapp" }[]>([]);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [selectedCampaignStatus, setSelectedCampaignStatus] = useState<"Promoção" | "Geral">("Promoção");
  const [targetAudience, setTargetAudience] = useState<"all" | "near_prize" | "birthday_today" | "birthday_month">("all");
  const [pointsThreshold, setPointsThreshold] = useState<number>(30); // points remaining to be considered "near"

  const getCustomizedMessageForClient = (rawMsg: string, client: ClientUser) => {
    const shortName = client.name ? client.name.split(" ")[0].trim() : "Cliente";
    const pts = client.points || 0;
    const target = companyInfo.loyaltyPointsTarget || 100;
    const remaining = Math.max(0, target - pts);
    
    return rawMsg
      .replace(/\[NOME\]/gi, shortName)
      .replace(/\[NFUL\]/gi, client.name)
      .replace(/\[PONTOS\]/gi, pts.toString())
      .replace(/\[RESTANTE\]/gi, remaining.toString());
  };

  const getFilteredCampaignClients = () => {
    if (targetAudience === "all") {
      return clientUsers;
    }
    if (targetAudience === "near_prize") {
      const target = companyInfo.loyaltyPointsTarget || 100;
      // Clientes que faltam poucos pontos (têm entre (target - pointsThreshold) e target-1 pontos)
      return clientUsers.filter(user => {
        const remaining = target - (user.points || 0);
        return remaining > 0 && remaining <= pointsThreshold;
      });
    }
    if (targetAudience === "birthday_today") {
      const today = new Date();
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      const currentDay = String(today.getDate()).padStart(2, '0');
      const todayMMDD = `${currentMonth}-${currentDay}`; // Format "MM-DD"

      return clientUsers.filter(user => {
        if (!user.birthday) return false;
        const bParts = user.birthday.split("-");
        if (bParts.length >= 3) {
          const bMonth = bParts[1];
          const bDay = bParts[2];
          return `${bMonth}-${bDay}` === todayMMDD;
        }
        return false;
      });
    }
    if (targetAudience === "birthday_month") {
      const today = new Date();
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

      return clientUsers.filter(user => {
        if (!user.birthday) return false;
        const bParts = user.birthday.split("-");
        if (bParts.length >= 2) {
          const bMonth = bParts[1];
          return bMonth === currentMonth;
        }
        return false;
      });
    }
    return clientUsers;
  };

  const generateTemplateText = (templateType: "current_day" | "all_promos" | "loyalty" | "loyalty_incentive" | "birthday" | "custom") => {
    setSelectedTemplate(templateType);
    if (templateType === "custom") {
      setPromoMessage("");
      return;
    }

    if (templateType === "current_day") {
      const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      const currentDayIndex = new Date().getDay();
      const currentDayName = dayNames[currentDayIndex];
      // Find configured weekday promo
      const todayPromo = promos.find(p => p.dayName.toLowerCase().includes(currentDayName.toLowerCase().substring(0, 3)));
      
      if (todayPromo && todayPromo.active) {
        setPromoMessage(`💜 PROMOÇÃO DO DIA! Hoje é ${currentDayName} e temos uma oferta imperdível: [${todayPromo.badge}] ${todayPromo.title} - ${todayPromo.description}. Aproveite para pedir direto do app! 🍧`);
      } else {
        // Fallback or find any active weekday promo
        const anyActivePromo = promos.find(p => p.active);
        if (anyActivePromo) {
          setPromoMessage(`💜 PROMOÇÃO ESPECIAL! Confira a oferta ativa na semana: [${anyActivePromo.badge}] ${anyActivePromo.title} (${anyActivePromo.dayName}): ${anyActivePromo.description}. Peça no nosso app e acumule pontos! ⚡`);
        } else {
          setPromoMessage(`🍧 PROMOÇÃO DO DIA! O sabor perfeito do nosso Açaí cremoso esperando por você hoje. Escolha seus acompanhamentos prediletos e venha saborear! Preços especiais no app de hoje! ✨`);
        }
      }
    } else if (templateType === "all_promos") {
      const activePromos = promos.filter(p => p.active);
      if (activePromos.length > 0) {
        const listText = activePromos.map(p => `• ${p.dayName}: ${p.title} (${p.description})`).join("\n");
        setPromoMessage(`📢 CONFIRA NOSSAS PROMOÇÕES ATIVAS DA SEMANA:\n\n${listText}\n\nFaça seu pedido diretamente no nosso aplicativo e acumule pontos no Clube de Fidelidade! 💜🍧`);
      } else {
        setPromoMessage(`📢 CONFIRA NOSSAS NOVIDADES! Oferecemos os melhores açaís, cremes deliciosos e adicionais fresquinhos todos os dias da semana. Faça já seu pedido! 🍧🌱`);
      }
    } else if (templateType === "loyalty") {
      setPromoMessage(`🎁 CLUBE FIDELIDADE: Sabia que suas compras acumulam pontos que valem prêmios reais? A cada 100 pontos acumulados no nosso site, você resgata 1 Açaí Inteiramente Grátis! Consulte seu saldo em "Fidelidade" e peça agora! 💜🧁`);
    } else if (templateType === "loyalty_incentive") {
      setPromoMessage(`🎁 RECOMPENSA QUASE LÁ! Olá, [NOME]! Você já acumulou [PONTOS] pontos no Club. Faltam apenas [RESTANTE] pontos para você resgatar seu AÇAÍ GRÁTIS de 500ml! 💜🍧 Faça seu pedido hoje para garantir esse prêmio especial e desfrutar do melhor sabor do açaí! ✨`);
    } else if (templateType === "birthday") {
      setPromoMessage(`🎉 FELIZ ANIVERSÁRIO, [NOME]! 🎂 Hoje o dia é especial e você merece comemorar com o melhor sabor! Ganhe 20 Pontos de Fidelidade de Presente e use o cupom PARABENS10 para ganhar 10% de desconto adicional na sua compra de aniversário hoje! 💜🎁🍒`);
    }
  };

  const handleBroadcastCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoMessage.trim()) {
      alert("Por favor, escreva uma mensagem antes de disparar!");
      return;
    }

    const targetedClients = getFilteredCampaignClients();

    if (targetedClients.length === 0) {
      alert("Nenhum cliente cadastrado se enquadra no público-alvo selecionado no momento.");
      return;
    }

    setIsSendingCampaign(true);
    const nowStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    let targetDesc = "todos os clientes cadastrados";
    if (targetAudience === "near_prize") {
      targetDesc = `clientes aproximando-se do prêmio (faltando <= ${pointsThreshold} pontos)`;
    }

    setCampaignLogs(prev => [
      { time: nowStr, text: `Iniciando campanha de disparos focada para ${targetDesc}...`, type: "info" },
      ...prev
    ]);

    // Send the customized notification base to the global feed
    if (onAddGlobalNotification) {
      let fallbackText = promoMessage;
      if (fallbackText.includes("[NOME]") || fallbackText.includes("[RESTANTE]")) {
        fallbackText = fallbackText
          .replace(/\[NOME\]/gi, "Cliente Especial")
          .replace(/\[NFUL\]/gi, "Prezado Cliente")
          .replace(/\[PONTOS\]/gi, "80")
          .replace(/\[RESTANTE\]/gi, "20");
      }
      onAddGlobalNotification(fallbackText, selectedCampaignStatus);
    }

    // Simulate sending to targeted users sequentially with small animation timeout
    let count = 0;
    targetedClients.forEach((user, index) => {
      setTimeout(() => {
        const timeLog = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const personalizedMsg = getCustomizedMessageForClient(promoMessage, user);
        
        setCampaignLogs(prev => [
          { 
            time: timeLog, 
            text: `✅ Disparado para: ${user.name} (${user.phone}) | Saldo: ${user.points} pts (Falta: ${Math.max(0, (companyInfo.loyaltyPointsTarget || 100) - user.points)} pts)`, 
            type: "success" 
          },
          {
            time: timeLog,
            text: `💬 Conteúdo: "${personalizedMsg.substring(0, 75)}${personalizedMsg.length > 75 ? "..." : ""}"`,
            type: "info"
          },
          ...prev
        ]);

        count++;
        if (count === targetedClients.length) {
          setIsSendingCampaign(false);
          const finalTimeLog = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          setCampaignLogs(prev => [
            { 
              time: finalTimeLog, 
              text: `🏁 Campanha concluída com sucesso! ${targetedClients.length} clientes receberam o comunicado.`, 
              type: "success" 
            },
            ...prev
          ]);
          alert(`Disparo automático finalizado! ${targetedClients.length} clientes foram notificados.`);
        }
      }, (index + 1) * 350);
    });
  };

  // Prepara dados do gráfico de vendas
  const chartDataResult = React.useMemo(() => {
    const hasRealOrders = orders && orders.length > 0;

    if (!hasRealOrders) {
      // Retorna os últimos 7 dias com faturamento/pedidos zerados (real)
      const days = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        days.push({
          name: dateStr,
          vendas: 0,
          pedidos: 0,
        });
      }
      return { data: days, isDemo: false };
    }

    // Agrupa pedidos reais por data DD/MM
    const grouped: Record<string, { faturamento: number; totalPedidos: number }> = {};
    
    // Filtra e ordena
    const activeOrders = orders.filter(o => o.status === "Finalizado");
    const sortedOrders = [...activeOrders].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedOrders.forEach((order) => {
      const dateObj = new Date(order.date);
      const dayMonth = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      
      if (!grouped[dayMonth]) {
        grouped[dayMonth] = { faturamento: 0, totalPedidos: 0 };
      }
      grouped[dayMonth].faturamento += order.total;
      grouped[dayMonth].totalPedidos += 1;
    });

    const keys = Object.keys(grouped);
    if (keys.length === 0) {
      return { data: [], isDemo: false };
    }

    const result = keys.map((key) => ({
      name: key,
      vendas: parseFloat(grouped[key].faturamento.toFixed(2)),
      pedidos: grouped[key].totalPedidos,
    }));

    return { data: result, isDemo: false };
  }, [orders]);

  // Calcula métricas resumidas
  const salesMetrics = React.useMemo(() => {
    const activeOrders = orders.filter(o => o.status === "Finalizado");
    const hasReal = activeOrders.length > 0;

    if (!hasReal) {
      return {
        totalRevenue: 0,
        totalCount: 0,
        ticketMedio: 0,
        isDemo: false,
      };
    }

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const totalCount = activeOrders.length;
    const ticketMedio = totalCount > 0 ? totalRevenue / totalCount : 0;

    return {
      totalRevenue,
      totalCount,
      ticketMedio,
      isDemo: false,
    };
  }, [orders]);

  // Settings tab form states
  const [settingsSuccess, setSettingsSuccess] = useState("");

  // State handles for CRUD
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    image: "",
    category: "tradicionais",
    sizes: [
      { size: "330ml", price: 15.00 },
      { size: "500ml", price: 20.00 }
    ]
  });

  const [editingVitrineId, setEditingVitrineId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newVitrine, setNewVitrine] = useState<Partial<VitrineItem>>({
    title: "",
    description: "",
    image: ""
  });

  const [editingSocialProofId, setEditingSocialProofId] = useState<string | null>(null);
  const [newSocialProof, setNewSocialProof] = useState<Partial<SocialProof>>({
    name: "",
    instagram: "",
    comment: "",
    rating: 5,
    image: DEFAULT_AVATAR_URL,
    storyImage: ""
  });

  const [companyForm, setCompanyForm] = useState<CompanyInfo>({ ...companyInfo });

  const DAYS_OF_WEEK = React.useMemo(() => [
    { key: "seg", label: "Segunda-feira" },
    { key: "ter", label: "Terça-feira" },
    { key: "qua", label: "Quarta-feira" },
    { key: "qui", label: "Quinta-feira" },
    { key: "sex", label: "Sexta-feira" },
    { key: "sab", label: "Sábado" },
    { key: "dom", label: "Domingo" },
  ] as const, []);

  const currentWeeklyHours: WeeklyHours = React.useMemo(() => companyForm.weeklyHours || {
    seg: { isOpen: true, start: "10:00", end: "00:00" },
    ter: { isOpen: true, start: "10:00", end: "00:00" },
    qua: { isOpen: true, start: "10:00", end: "00:00" },
    qui: { isOpen: true, start: "10:00", end: "00:00" },
    sex: { isOpen: true, start: "10:00", end: "00:00" },
    sab: { isOpen: true, start: "10:00", end: "00:00" },
    dom: { isOpen: true, start: "10:00", end: "00:00" },
  }, [companyForm.weeklyHours]);

  const handleDayScheduleChange = (dayKey: keyof WeeklyHours, field: keyof DailyHour, val: any) => {
    const updatedWeekly = {
      ...currentWeeklyHours,
      [dayKey]: {
        ...currentWeeklyHours[dayKey],
        [field]: val
      }
    };
    setCompanyForm((prev) => ({
      ...prev,
      weeklyHours: updatedWeekly
    }));
  };

  const isFirstMountCompany = React.useRef(true);
  React.useEffect(() => {
    if (isFirstMountCompany.current) {
      setCompanyForm({ ...companyInfo });
      isFirstMountCompany.current = false;
    } else {
      setCompanyForm((prevForm) => {
        const updatedForm = { ...prevForm };
        (Object.keys(companyInfo) as Array<keyof CompanyInfo>).forEach((key) => {
          if (
            prevForm[key] === undefined ||
            prevForm[key] === null ||
            prevForm[key] === "" ||
            prevForm[key] === companyInfo[key]
          ) {
            (updatedForm as any)[key] = companyInfo[key];
          }
        });
        return updatedForm;
      });
    }
  }, [companyInfo]);

  // Loyalty Add State
  const [loyaltyForm, setLoyaltyForm] = useState({ name: "", phone: "", points: 0 });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === adminEmail && password === adminPassword) {
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("E-mail ou senha incorretos! Verifique suas credenciais de acesso.");
    }
  };

  // Helper to load file and output Base64 string for offline images
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          callback(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // -------- COMPANY INFO HANDLERS --------
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompanyInfo(companyForm);
    alert("Informações da açaíteria atualizadas com sucesso!");
  };

  // -------- SETTINGS / ADMIN CREDENTIALS HANDLERS --------
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      alert("Por favor, preencha todos os campos!");
      return;
    }
    if (newAdminPassword.length < 4) {
      alert("A senha de administrador deve conter ao menos 4 caracteres.");
      return;
    }

    saveAdminCredentialsCloud(newAdminEmail.trim(), newAdminPassword.trim()).then(() => {
      setAdminEmail(newAdminEmail.trim());
      setAdminPassword(newAdminPassword.trim());

      // Clear input fields so they stay blank and secure
      setEmail("");
      setPassword("");

      setSettingsSuccess("Sucesso! Suas novas credenciais de acesso foram configuradas e salvas com segurança no banco de dados.");
      setTimeout(() => {
        setSettingsSuccess("");
      }, 6000);
    }).catch((err) => {
      console.error("[Firebase] Error saving admin credentials:", err);
      alert("Erro ao salvar credenciais de segurança no banco de dados.");
    });
  };

  // -------- PRODUCT HANDLERS --------
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sizes || newProduct.sizes.length === 0) {
      alert("Por favor insira nome e tamanho do produto!");
      return;
    }
    const defaultImage = "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80";
    const productToAdd: Product = {
      id: "product_" + Date.now(),
      name: newProduct.name,
      description: newProduct.description || "",
      image: newProduct.image || defaultImage,
      category: newProduct.category || "tradicionais",
      sizes: newProduct.sizes as any,
      active: newProduct.active !== false,
      isFridayOnly: !!newProduct.isFridayOnly,
    };

    onUpdateProducts([productToAdd, ...products]);
    setNewProduct({
      name: "",
      description: "",
      image: "",
      category: "tradicionais",
      sizes: [
        { size: "330ml", price: 15.00 },
        { size: "500ml", price: 20.00 }
      ],
      active: true,
      isFridayOnly: false,
    });
    alert("Produto cadastrado com sucesso!");
  };

  const handleStartEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setNewProduct({ ...prod, active: prod.active !== false, isFridayOnly: !!prod.isFridayOnly });
  };

  const handleSaveEditProduct = () => {
    if (!newProduct.name || !newProduct.id) return;
    const updated = products.map((p) => {
      if (p.id === newProduct.id) {
        const prodData = {
          ...(newProduct as Product),
          active: newProduct.active !== false,
          isFridayOnly: !!newProduct.isFridayOnly
        };
        if (p.image !== newProduct.image) {
          delete prodData.images;
        }
        return prodData;
      }
      return p;
    });
    onUpdateProducts(updated);
    setEditingProductId(null);
    setNewProduct({
      name: "",
      description: "",
      image: "",
      category: "tradicionais",
      sizes: [
        { size: "330ml", price: 15.00 },
        { size: "500ml", price: 20.00 }
      ],
      active: true,
      isFridayOnly: false,
    });
    alert("Produto atualizado!");
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Deseja realmente remover este produto?")) {
      onUpdateProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleToggleProductActive = (id: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false; // If currently inactive (false), next is active (true)
    const updated = products.map((p) =>
      p.id === id ? { ...p, active: nextStatus } : p
    );
    onUpdateProducts(updated);
  };

  const handleAddSizeRow = () => {
    const currentSizes = newProduct.sizes ? [...newProduct.sizes] : [];
    currentSizes.push({
      size: "Combo Único",
      price: 15.00,
      originalPrice: 20.00
    });
    setNewProduct({ ...newProduct, sizes: currentSizes });
  };

  const handleRemoveSizeRow = (index: number) => {
    if (!newProduct.sizes) return;
    if (newProduct.sizes.length <= 1) {
      alert("O produto precisa ter pelo menos uma variação ou preço.");
      return;
    }
    const currentSizes = [...newProduct.sizes];
    currentSizes.splice(index, 1);
    setNewProduct({ ...newProduct, sizes: currentSizes });
  };

  const handleUpdateSizeField = (index: number, field: "size" | "price" | "originalPrice", value: any) => {
    if (!newProduct.sizes) return;
    const currentSizes = [...newProduct.sizes];
    if (field === "price" || field === "originalPrice") {
      if (value === "") {
        if (field === "originalPrice") {
          delete currentSizes[index].originalPrice;
        } else {
          currentSizes[index].price = 0;
        }
      } else {
        const num = parseFloat(value);
        currentSizes[index][field] = isNaN(num) ? 0 : num;
      }
    } else {
      currentSizes[index][field] = value;
    }
    setNewProduct({ ...newProduct, sizes: currentSizes });
  };

  // -------- VITRINE SLIDES HANDLERS (MAX 30 IMAGES) --------
  const handleAddOrUpdateVitrine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVitrine.image) {
      alert("Por favor adicione a imagem do slide!");
      return;
    }

    if (editingVitrineId) {
      const updated = vitrine.map((item) =>
        item.id === editingVitrineId ? ({ ...item, ...newVitrine } as VitrineItem) : item
      );
      onUpdateVitrine(updated);
      setEditingVitrineId(null);
      alert("Slide atualizado com sucesso!");
    } else {
      if (vitrine.length >= 30) {
        alert("Limite atingido! A vitrine aceita no máximo 30 imagens de slides cadastradas.");
        return;
      }
      const newItem: VitrineItem = {
        id: "vit_" + Date.now(),
        image: newVitrine.image,
        title: newVitrine.title || "Novidade!",
        description: newVitrine.description || "Aproveite esta novidade no Açaí Delivery."
      };
      onUpdateVitrine([...vitrine, newItem]);
      alert("Novo slide adicionado com sucesso!");
    }

    setNewVitrine({ title: "", description: "", image: "" });
  };

  const handleStartEditVitrine = (item: VitrineItem) => {
    setEditingVitrineId(item.id);
    setNewVitrine({ ...item });
  };

  const handleDeleteVitrine = (id: string) => {
    if (confirm("Deseja remover este slide da vitrine?")) {
      onUpdateVitrine(vitrine.filter((v) => v.id !== id));
    }
  };

  // -------- PROVAS SOCIAIS (SOCIAL PROOFS) HANDLERS --------
  const handleSaveSocialProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSocialProof.name || !newSocialProof.storyImage) {
      alert("Por favor, informe o nome e insira o print do Story do cliente!");
      return;
    }

    if (editingSocialProofId) {
      const updated = socialProofs.map((p) =>
        p.id === editingSocialProofId ? ({ ...p, ...newSocialProof, comment: "" } as SocialProof) : p
      );
      onUpdateSocialProofs(updated);
      setEditingSocialProofId(null);
      alert("Depoimento atualizado!");
    } else {
      const newItem: SocialProof = {
        id: "proof_" + Date.now(),
        name: newSocialProof.name,
        instagram: newSocialProof.instagram || "anonimo",
        comment: "",
        rating: 5,
        image: newSocialProof.image || DEFAULT_AVATAR_URL,
        storyImage: newSocialProof.storyImage
      };
      onUpdateSocialProofs([newItem, ...socialProofs]);
      alert("Depoimento adicionado com sucesso!");
    }

    setNewSocialProof({ 
      name: "", 
      instagram: "", 
      comment: "", 
      rating: 5, 
      image: DEFAULT_AVATAR_URL,
      storyImage: ""
    });
  };

  const handleDeleteSocialProof = (id: string) => {
    if (confirm("Deseja remover esta prova social?")) {
      onUpdateSocialProofs(socialProofs.filter((p) => p.id !== id));
    }
  };

  // -------- PROMOÇÃO DAILY PROMOS WEEK HANDLERS --------
  const handleTogglePromo = (id: string) => {
    const updated = promos.map((p) => (p.id === id ? { ...p, active: !p.active } : p));
    onUpdatePromos(updated);
  };

  const handleSavePromoConfig = (
    id: string,
    updatedTitle: string,
    updatedComment: string,
    badgeTxt: string,
    fridaySelectedProductId?: string,
    fridaySpecialPrice?: number
  ) => {
    const updated = promos.map((p) =>
      p.id === id
        ? {
            ...p,
            title: updatedTitle,
            description: updatedComment,
            badge: badgeTxt,
            fridaySelectedProductId: id === "sex" ? fridaySelectedProductId : p.fridaySelectedProductId,
            fridaySpecialPrice: id === "sex" ? fridaySpecialPrice : p.fridaySpecialPrice,
          }
        : p
    );
    onUpdatePromos(updated);
    alert("Promoção diária atualizada!");
  };

  // -------- FIDELIDADE HANDLERS --------
  const handleRegisterUserManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loyaltyForm.name || !loyaltyForm.phone) {
      alert("Preencha nome e telefone!");
      return;
    }
    onRegisterLoyaltyUser(loyaltyForm.name, loyaltyForm.phone, loyaltyForm.points);
    setLoyaltyForm({ name: "", phone: "", points: 0 });
    alert("Cliente fidelidade cadastrado com sucesso!");
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden text-brand-charcoal">
        <div className="p-6 bg-brand-purple text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
            <Lock className="w-8 h-8 text-brand-pistachio" />
          </div>
          <h2 className="font-display font-bold text-xl">Painel Administrativo</h2>
          <p className="text-purple-200 text-xs mt-1">Apenas equipe autorizada da Açaí Delivery</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {loginError && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 font-medium leading-relaxed">
              {loginError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> E-mail de Administrador
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple"
              placeholder="exemplo@gmail.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Senha de Segurança
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            id="admin-login-submit"
            type="submit"
            className="w-full bg-brand-purple hover:bg-brand-purple-light text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs"
          >
            Acessar Painel de Controle
          </button>


        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 md:p-6 text-brand-charcoal">
      {/* Header Admin Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-brand-purple text-white rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-brand-pistachio" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg leading-tight">Painel do Administrador</h2>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              ● Sessão de Gerenciamento Ativa
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setIsLoggedIn(false);
            setEmail("");
            setPassword("");
          }}
          className="mt-3 sm:mt-0 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 self-start"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair do Painel
        </button>
      </div>

      {/* Tabs list inside config database */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-150 mb-5 shrink-0 select-none no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        {[
          { id: "vendas", label: "Faturamento", icon: TrendingUp },
          { id: "vendas_whatsapp", label: "Vendas WhatsApp", icon: MessageCircle },
          { id: "company", label: "Empresa", icon: Building2 },
          { id: "products", label: "Produtos", icon: ShoppingBag },
          { id: "vitrine", label: "Vitrine", icon: Image },
          { id: "proofs", label: "Avaliações", icon: MessageSquare },
          { id: "promos", label: "Promoções", icon: Tag },
          { id: "loyalty", label: "Fidelidade", icon: Award },
          { id: "clients", label: "Clientes", icon: User },
          { id: "incentivo_fidelidade", label: "Incentivo Fidelidade", icon: Sparkles },
          { id: "settings", label: "Acesso & Segurança", icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingProductId(null);
                setEditingVitrineId(null);
                setEditingSocialProofId(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-md transition-all border whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-purple-900 text-white border-purple-900 shadow-sm"
                  : "bg-white text-gray-500 hover:text-purple-900 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT RENDERERS */}

      {/* 🟢 CONTROLE E CONFIRMAÇÃO DE VENDAS DO WHATSAPP (ACOMPANHAMENTO FIDELIDADE) */}
      {activeTab === "vendas_whatsapp" && (() => {
        const pendingOrdersList = (orders || []).filter(
          (o) => !o.pointsProcessed && o.status !== "Cancelado" && (o.status === "Pendente de confirmação no WhatsApp" || (((o.pointsEarned || 0) > 0) || ((o.pointsRedeemed || 0) > 0)))
        );
        const pendingPointsCountTotal = pendingOrdersList.reduce((sum, o) => sum + (o.pointsEarned || 0), 0);
        
        const confirmedOrdersList = (orders || []).filter(
          (o) => o.pointsProcessed && (o.status === "Finalizado" || o.status === "Entregue")
        );
        
        const canceledOrdersList = (orders || []).filter(
          (o) => o.status === "Cancelado"
        );

        const getFilteredOrdersList = () => {
          let baseList = pendingOrdersList;
          switch (whatsappFilter) {
            case "pending":
              baseList = pendingOrdersList;
              break;
            case "confirmed":
              baseList = confirmedOrdersList;
              break;
            case "canceled":
              baseList = canceledOrdersList;
              break;
            default:
              baseList = pendingOrdersList;
          }

          if (salesSearchQuery.trim()) {
            const query = salesSearchQuery.toLowerCase().trim();
            const cleanQueryNum = query.replace(/\D/g, "");
            return baseList.filter((o) => {
              const nameMatch = (o.customerName || "").toLowerCase().includes(query);
              const phoneMatch = cleanQueryNum 
                ? (o.customerPhone || "").replace(/\D/g, "").includes(cleanQueryNum)
                : (o.customerPhone || "").toLowerCase().includes(query);
              const idMatch = o.id.toLowerCase().includes(query);
              const addressMatch = (o.address || "").toLowerCase().includes(query);
              const itemsMatch = o.items.some((item) => item.name.toLowerCase().includes(query));
              return nameMatch || phoneMatch || idMatch || addressMatch || itemsMatch;
            });
          }
          return baseList;
        };

        const filteredOrdersToShow = getFilteredOrdersList();

        return (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-brand-purple text-white p-6 rounded-2xl shadow-sm relative overflow-hidden text-left border-b-4 border-lime-400">
              <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <span className="bg-lime-400 text-purple-950 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full inline-block shadow-sm">
                  ⚡ Controle de Pontos App
                </span>
                <h3 className="font-display font-black text-lg md:text-2xl flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-lime-400 animate-pulse shrink-0" />
                  Validação de Compras no WhatsApp
                </h3>
                <p className="text-xs text-purple-100 max-w-3xl leading-relaxed">
                  Os clientes do site montam e enviam o pedido para o seu WhatsApp. Use este painel para confirmar se as compras foram finalizadas no diálogo do aplicativo e liberar a devida pontuação de fidelidade (<strong>10 pontos por copo de açaí pedido</strong>).
                </p>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-2xl shrink-0 border border-amber-100">
                  ⏳
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Aguardando Validação</p>
                  <h4 className="text-lg font-black text-amber-800">{pendingOrdersList.length} {pendingOrdersList.length === 1 ? 'pedido' : 'pedidos'}</h4>
                  <p className="text-[9px] text-gray-500 font-mono">+{pendingPointsCountTotal} pontos pendentes</p>
                </div>
              </div>

              <div className="bg-white border border-emerald-250 rounded-xl p-4 shadow-sm flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 font-bold text-2xl shrink-0 border border-emerald-100">
                  ❇️
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Vendas Confirmadas</p>
                  <h4 className="text-lg font-black text-emerald-800">{confirmedOrdersList.length} {confirmedOrdersList.length === 1 ? 'pedido' : 'pedidos'}</h4>
                  <p className="text-[9px] text-gray-500">Créditos de fidelidade liberados</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-2xl shrink-0 border border-gray-100">
                  ✖️
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Canceladas / Não Concluiu</p>
                  <h4 className="text-lg font-black text-gray-800">{canceledOrdersList.length} {canceledOrdersList.length === 1 ? 'pedido' : 'pedidos'}</h4>
                  <p className="text-[9px] text-gray-500">Sem alteração de pontos</p>
                </div>
              </div>
            </div>

            {/* Filter control buttons & Search Bar */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-150 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                <div className="space-y-1 text-left">
                  <h4 className="font-extrabold text-xs text-purple-950 uppercase tracking-widest font-mono">
                    Segmentar por status
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Selecione o status para visualizar no painel de liberação.
                  </p>
                </div>
                
                {(salesSearchQuery || whatsappFilter !== "pending") && (
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappFilter("pending");
                      setSalesSearchQuery("");
                    }}
                    className="text-[10px] font-black text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                  >
                    🧹 Limpar Filtros
                  </button>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-3">
                {/* Status Toggles */}
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <button
                    type="button"
                    onClick={() => setWhatsappFilter("pending")}
                    className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
                      whatsappFilter === "pending"
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/10"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>📥 Aguardando Confirmação</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${whatsappFilter === "pending" ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {pendingOrdersList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappFilter("confirmed")}
                    className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
                      whatsappFilter === "confirmed"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650 shadow-md shadow-emerald-650/10"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>✅ Vendas Concluídas</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${whatsappFilter === "confirmed" ? "bg-emerald-850 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {confirmedOrdersList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWhatsappFilter("canceled")}
                    className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
                      whatsappFilter === "canceled"
                        ? "bg-red-500 hover:bg-red-650 text-white border-red-600 shadow-md shadow-red-500/10"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>❌ Canceladas</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${whatsappFilter === "canceled" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {canceledOrdersList.length}
                    </span>
                  </button>
                </div>

                {/* Search Bar Input */}
                <div className="relative lg:w-80 w-full shrink-0">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                    placeholder="Buscar cliente, telefone, id..."
                    className="w-full bg-white text-xs text-gray-800 placeholder-gray-400 pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-purple-600 transition-all font-sans font-medium"
                  />
                  {salesSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSalesSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold font-sans cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Status report indicator */}
              <div className="text-[10px] text-purple-950/70 font-sans font-bold flex items-center gap-1.5 px-1 text-left">
                <span>🔍</span>
                <span>
                  Exibindo <strong>{filteredOrdersToShow.length}</strong> de{" "}
                  <strong>
                    {whatsappFilter === "pending"
                      ? pendingOrdersList.length
                      : whatsappFilter === "confirmed"
                      ? confirmedOrdersList.length
                      : canceledOrdersList.length}
                  </strong>{" "}
                  pedidos em{" "}
                  <strong className="underline">
                    {whatsappFilter === "pending"
                      ? "Aguardando Confirmação"
                      : whatsappFilter === "confirmed"
                      ? "Vendas Concluídas"
                      : "Canceladas"}
                  </strong>
                  {salesSearchQuery && (
                    <>
                      {" "}
                      filtrados por <span className="bg-purple-100 border border-purple-200 text-purple-950 px-1.5 py-0.5 rounded-sm">"{salesSearchQuery}"</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* List showcase */}
            <div className="space-y-4 font-sans">
              {filteredOrdersToShow.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-3xl py-14 px-6 shadow-sm flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-3xl mb-4">
                    🔍
                  </div>
                  <h4 className="font-display font-black text-sm text-gray-800 uppercase tracking-wide">Sem pedidos nesta lista</h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed max-w-xs">
                    {whatsappFilter === "pending"
                      ? "Nenhum pedido de açaí pendente de confirmação no WhatsApp no momento. Bom trabalho!"
                      : whatsappFilter === "confirmed"
                      ? "Você ainda não confirmou nenhuma venda vinda do WhatsApp para liberação de pontos."
                      : "Nenhuma venda foi cancelada ou marcada como não concluída."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredOrdersToShow.map((order) => {
                    const totalAcaisQty = order.items.reduce((acc, item) => acc + item.quantity, 0);
                    const netEarned = order.pointsEarned || (totalAcaisQty * 10);
                    const netRedeemed = order.pointsRedeemed || 0;
                    const finalBalanceToCredit = netEarned - netRedeemed;
                    const cleanPhone = (order.customerPhone || "").replace(/\D/g, "");
                    const waLink = `https://wa.me/55${cleanPhone}`;

                    return (
                      <div
                        key={order.id}
                        className={`bg-white border rounded-3xl p-5 shadow-sm space-y-4 text-left transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                          whatsappFilter === "pending"
                            ? "border-amber-200 hover:border-amber-300"
                            : whatsappFilter === "confirmed"
                            ? "border-emerald-250 hover:border-emerald-300"
                            : "border-gray-200 opacity-95"
                        }`}
                      >
                        {/* Upper Details Panel */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-2 flex-wrap pb-2 border-b border-gray-100">
                            <div className="space-y-1">
                              <span className="font-mono text-xs font-black text-purple-950 bg-purple-50 border border-purple-150 px-2.5 py-1 rounded-lg">
                                #{order.id}
                              </span>
                              <span className="text-[10px] text-gray-400 block pt-1 font-mono">
                                ⏱️ {new Date(order.date).toLocaleDateString("pt-BR")} às {new Date(order.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <div className="flex flex-col items-end">
                              {order.pointsProcessed ? (
                                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                                  ✔️ Pontos Creditados
                                </span>
                              ) : order.status === "Cancelado" ? (
                                <span className="bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-red-200">
                                  ❌ Cancelado / Não Concluiu
                                </span>
                              ) : (
                                <span className="bg-amber-55 text-amber-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-250 animate-pulse">
                                  ⏳ Pendente
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Customer Profile box details */}
                          <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3 space-y-2.5">
                            <div className="flex flex-col">
                              <span className="text-gray-400 text-[9px] font-mono font-black uppercase tracking-widest leading-none">Cliente</span>
                              <span className="font-bold text-gray-800 text-xs mt-1 block">
                                {order.customerName || "Nome não cadastrado"}
                              </span>
                            </div>
                            
                            {order.customerPhone && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-gray-600 bg-white border border-gray-150 px-2.5 py-0.5 rounded-lg font-bold">
                                  📞 {order.customerPhone}
                                </span>
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase px-3 py-1 rounded-full transition-all shadow-xs shrink-0 cursor-pointer"
                                >
                                  <MessageSquare className="w-2.5 h-2.5 fill-white shrink-0" />
                                  <span>Ver Conversa</span>
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Items specification layout */}
                          <div className="space-y-2">
                            <span className="text-gray-400 text-[9px] font-mono font-black uppercase tracking-widest block">Itens Solicitados</span>
                            <div className="space-y-2 bg-purple-50/10 p-4 rounded-2xl border border-dashed border-gray-150">
                              {order.items.map((item, index) => {
                                const hasCustom = item.customizations && (
                                  (item.customizations.complements?.length || 0) > 0 ||
                                  (item.customizations.fruits?.length || 0) > 0 ||
                                  (item.customizations.sauces?.length || 0) > 0 ||
                                  (item.customizations.additionals?.length || 0) > 0
                                );

                                return (
                                  <div key={index} className="py-1.5 border-b border-purple-100/40 last:border-0 last:pb-0 first:pt-0">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-900 font-black">
                                        🥣 {item.quantity}x {item.name} ({item.size})
                                      </span>
                                      <span className="font-mono text-purple-950 font-black">
                                        R$ {(item.price * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                    
                                    {hasCustom && item.customizations && (
                                      <div className="mt-1.5 pl-3.5 space-y-1 text-[10px] text-gray-600 border-l-2 border-purple-300">
                                        {item.customizations.complements && item.customizations.complements.length > 0 && (
                                          <div>
                                            <span className="text-purple-900 font-extrabold font-sans">Acompanhamentos:</span> {item.customizations.complements.join(", ")}
                                          </div>
                                        )}
                                        {item.customizations.fruits && item.customizations.fruits.length > 0 && (
                                          <div>
                                            <span className="text-purple-900 font-extrabold font-sans">Frutas:</span> {item.customizations.fruits.join(", ")}
                                          </div>
                                        )}
                                        {item.customizations.sauces && item.customizations.sauces.length > 0 && (
                                          <div>
                                            <span className="text-purple-900 font-extrabold font-sans">Caldas:</span> {item.customizations.sauces.join(", ")}
                                          </div>
                                        )}
                                        {item.customizations.additionals && item.customizations.additionals.length > 0 && (
                                          <div>
                                            <span className="text-emerald-700 font-black font-sans">Adicionais Extras:</span> {item.customizations.additionals.join(", ")}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              <div className="border-t border-gray-150 pt-3 flex justify-between items-center font-bold text-xs mt-2">
                                <span className="text-purple-950 font-black">Preço de Fechamento:</span>
                                <span className="font-mono font-black text-purple-950 text-sm">
                                  R$ {order.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* POINT GENERATION FORMULA EXPLAINER */}
                          <div className="bg-lime-50/40 border-2 border-lime-200/60 rounded-2xl p-4.5 space-y-2">
                            <div className="flex justify-between items-center pb-1.5 border-b border-lime-200/40">
                              <span className="text-purple-950 font-black text-xs flex items-center gap-1.5">
                                ⭐ Regra de Fidelidade Aplicada
                              </span>
                              <span className="bg-lime-400 text-purple-950 font-extrabold text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-md shadow-xs">
                                Copo Açaí = 10 pts
                              </span>
                            </div>

                            <div className="space-y-1 text-[11px] text-gray-600">
                              <div className="flex justify-between">
                                <span>Quantidade de Açaí Pedida:</span>
                                <span className="font-bold text-gray-900">{totalAcaisQty} {totalAcaisQty === 1 ? 'copo' : 'copos'}</span>
                              </div>
                              <div className="flex justify-between text-emerald-800">
                                <span>Pontos Gerados (+{totalAcaisQty} × 10):</span>
                                <span className="font-black">+ {netEarned} pts</span>
                              </div>
                              {netRedeemed > 0 && (
                                <div className="flex justify-between text-amber-800">
                                  <span>Descontos / Resgates Utilizados:</span>
                                  <span className="font-bold">- {netRedeemed} pts</span>
                                </div>
                              )}
                              
                              <div className="border-t border-dashed border-lime-300 pt-2 flex justify-between font-black text-purple-950 text-xs mt-1 bg-lime-100/30 p-1.5 rounded-lg">
                                <span>Pontos a serem creditados:</span>
                                <span className="text-lime-700 text-sm font-black">
                                  ⭐ {finalBalanceToCredit} pontos
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Address & Payment Information layout */}
                          <div className="text-[10px] text-gray-500 space-y-1 pt-1 border-t border-gray-100 leading-relaxed font-medium">
                            <p>
                              <strong className="text-gray-700">Forma de Pagamento:</strong> {order.paymentMethod || "Não definida"}
                              {order.paymentMethod === "Dinheiro" && order.changeFor && (
                                <span className="text-amber-800 font-bold ml-1">
                                  (Troco para: R$ {order.changeFor})
                                </span>
                              )}
                            </p>
                            <p>
                              <strong className="text-gray-700">Endereço Fornecido:</strong> {order.address || "Retirada no Local"}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons (Only displayed under pending filter) */}
                        {whatsappFilter === "pending" && !order.pointsProcessed && (
                          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2 w-full shrink-0">
                            <div className="flex gap-2 w-full">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirmingOrderId === order.id) {
                                    onConfirmWhatsAppPurchase && onConfirmWhatsAppPurchase(order.id);
                                    setConfirmingOrderId(null);
                                  } else {
                                    setConfirmingOrderId(order.id);
                                    setCancelingOrderId(null);
                                    // Auto reset after 5 seconds
                                    setTimeout(() => {
                                      setConfirmingOrderId(prev => prev === order.id ? null : prev);
                                    }, 5000);
                                  }
                                }}
                                className={`flex-1 font-black text-xs py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-[0.98] ${
                                  confirmingOrderId === order.id
                                    ? "bg-lime-400 hover:bg-lime-500 text-purple-950 border-lime-500 animate-pulse"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-600/10"
                                  }`}
                              >
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                <span>
                                  {confirmingOrderId === order.id
                                    ? "⚠️ Clique de Novo para Confirmar!"
                                    : "Confirmar Venda (Liberar Pontos)"}
                                </span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (cancelingOrderId === order.id) {
                                    onUpdateOrderStatus && onUpdateOrderStatus(order.id, "Cancelado");
                                    setCancelingOrderId(null);
                                  } else {
                                    setCancelingOrderId(order.id);
                                    setConfirmingOrderId(null);
                                    // Auto reset after 5 seconds
                                    setTimeout(() => {
                                      setCancelingOrderId(prev => prev === order.id ? null : prev);
                                    }, 5000);
                                  }
                                }}
                                className={`font-bold text-xs py-3 px-4 rounded-xl border transition-all flex items-center justify-center cursor-pointer active:scale-[0.98] ${
                                  cancelingOrderId === order.id
                                    ? "bg-red-600 hover:bg-red-700 text-white border-red-700"
                                    : "bg-red-50 hover:bg-red-100 text-red-650 border-red-200"
                                }`}
                                title="Marcar como Cancelado"
                              >
                                <span>
                                  {cancelingOrderId === order.id
                                    ? "Confirmar?"
                                    : "Cancelar"}
                                </span>
                              </button>
                            </div>
                            
                            {(confirmingOrderId === order.id || cancelingOrderId === order.id) && (
                              <p className="text-[10px] text-amber-600 font-bold font-sans text-center mt-1 animate-fade-in">
                                {confirmingOrderId === order.id 
                                  ? "💡 Confirme apenas se a venda foi finalizada no WhatsApp! Isso adicionará os pontos ao cliente."
                                  : "💡 Se cancelar, os pontos deste pedido não serão depositados."}
                              </p>
                            )}
                          </div>
                        )}

                        {whatsappFilter === "confirmed" && (
                          <div className="mt-4 bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-2xl text-[11px] font-black text-center flex items-center justify-center gap-1.5 shrink-0">
                            🎉 Pedido faturado e pontos de fidelidade já foram processados!
                          </div>
                        )}

                        {whatsappFilter === "canceled" && (
                          <div className="mt-4 bg-red-50 text-red-750 border border-red-200 p-3 rounded-2xl text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shrink-0">
                            ❌ Pedido cancelado pelo painel administrativo. Nenhum ponto alterado.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 📈 DADOS DE VENDAS & RELATÓRIOS (RECHARTS SUMMARY) */}
      {activeTab === "vendas" && (
        <div className="space-y-6">
          <div className="bg-purple-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-left">
                <h3 className="font-display font-black text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-200" />
                  Relatórios de Vendas & Faturamento
                </h3>
                <p className="text-xs text-purple-100 mt-1 max-w-2xl">
                  Monitore o crescimento financeiro, o volume de pedidos diários e o ticket médio gerado na sua açaíteria de maneira em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={exportToPDF}
                className="shrink-0 bg-white hover:bg-purple-50 text-purple-950 font-bold text-xs px-4 py-2.5 rounded-xl border border-purple-250 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 self-start sm:self-center cursor-pointer group"
              >
                <Download className="w-4 h-4 text-purple-900 group-hover:scale-110 transition-transform" />
                <span>Exportar PDF Contábil</span>
              </button>
            </div>
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-purple-200/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-950 shrink-0 border border-purple-100/50">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faturamento Bruto</span>
                <span className="text-lg font-black text-gray-900 block font-mono">
                  R$ {salesMetrics.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {salesMetrics.isDemo && (
                  <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">Demonstração</span>
                )}
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-purple-200/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-950 shrink-0 border border-purple-100/50">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total de Pedidos</span>
                <span className="text-lg font-black text-gray-900 block font-mono">
                  {salesMetrics.totalCount} {salesMetrics.totalCount === 1 ? "pedido" : "pedidos"}
                </span>
                {salesMetrics.isDemo && (
                  <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">Demonstração</span>
                )}
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-purple-200/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-950 shrink-0 border border-purple-100/50">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ticket Médio</span>
                <span className="text-lg font-black text-gray-900 block font-mono">
                  R$ {salesMetrics.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {salesMetrics.isDemo && (
                  <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">Demonstração</span>
                )}
              </div>
            </div>
          </div>

          {/* Demo Alert if no real sales exist */}
          {salesMetrics.isDemo && (
            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
              <span className="text-amber-500 text-base mt-0.5 shrink-0">💡</span>
              <div className="text-xs text-amber-800 leading-relaxed text-left">
                <b>Modo Demonstração Ativo:</b> Não foram encontrados pedidos reais finalizados no histórico de vendas da loja ainda. Conclua compras reais no catálogo para atualizar este painel automaticamente com os seus dados reais de faturamento de forma 100% dinâmica!
              </div>
            </div>
          )}

          {/* Area Chart Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="text-left">
                <h4 className="font-display font-black text-sm text-gray-900 uppercase">Evolução de Faturamento Diário</h4>
                <p className="text-[11px] text-gray-400">Total acumulado de vendas por data de recebimento (exclui pedidos cancelados)</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <span className="w-3 h-3 rounded-full bg-purple-900 inline-block" />
                <span>Faturamento (R$)</span>
              </div>
            </div>

            {/* Recharts container */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartDataResult.data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#581c87" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#581c87" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 505 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 505 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(val) => `R$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '12px', 
                      border: '1px solid #f3f4f6', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      fontSize: '11px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    formatter={(value: any) => [`R$ ${parseFloat(value).toFixed(2)}`, "Faturamento"]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#581c87" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorVendas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart or Pedidos volume chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="text-left">
                <h4 className="font-display font-black text-sm text-gray-900 uppercase">Volume de Pedidos Diários</h4>
                <p className="text-[11px] text-gray-400">Quantidade de pedidos processados por dia</p>
              </div>
              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDataResult.data}
                    margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 505 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 505 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        borderRadius: '12px', 
                        border: '1px solid #f3f4f6', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                        fontSize: '11px'
                      }}
                      formatter={(value: any) => [`${value} pedidos`, "Volume"]}
                    />
                    <Bar dataKey="pedidos" fill="#7e22ce" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List of recent orders for context */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="text-left">
                <h4 className="font-display font-black text-sm text-gray-900 uppercase">Últimas Vendas</h4>
                <p className="text-[11px] text-gray-400">Pedidos mais recentes registrados no sistema</p>
              </div>
              
              <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1 my-2 flex-1 scrollbar-thin text-left">
                {orders && orders.length > 0 ? (
                  [...orders].reverse().slice(0, 5).map((order) => (
                    <div key={order.id} className="p-3 bg-gray-50 border rounded-xl text-[11px] space-y-1.5 hover:border-purple-200 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-brand-purple">{order.id}</span>
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateOrderStatus && onUpdateOrderStatus(order.id, e.target.value as any)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer outline-none transition-all ${
                            order.status === "Cancelado" 
                              ? "bg-red-50 text-red-700 border-red-250 hover:bg-red-100" 
                              : order.status === "Entregue" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100"
                              : order.status === "Em preparo"
                              ? "bg-amber-50 text-amber-700 border-amber-250 hover:bg-amber-100"
                              : order.status === "Saiu para entrega"
                              ? "bg-sky-50 text-sky-700 border-sky-250 hover:bg-sky-100"
                              : "bg-purple-50 text-purple-700 border-purple-250 hover:bg-purple-100"
                          }`}
                        >
                          <option value="Recebido">Recebido</option>
                          <option value="Em preparo">Em preparo</option>
                          <option value="Saiu para entrega">A caminho</option>
                          <option value="Entregue">Entregue</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                      
                      <div className="flex justify-between text-gray-550">
                        <span>Cliente: {order.customerName || "Anônimo"}</span>
                        <span className="font-semibold text-gray-800 font-mono font-bold">
                          R$ {order.total.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="text-[9px] text-gray-400">
                        ⏱️ {new Date(order.date).toLocaleDateString("pt-BR")} às {new Date(order.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>

                      {((order.pointsEarned || 0) > 0 || (order.pointsRedeemed || 0) > 0) && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            {order.pointsProcessed ? (
                              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                ❇️ Pontos App: Concluído (+{order.pointsEarned || 0} pts{order.pointsRedeemed ? `, -${order.pointsRedeemed} resgatados` : ""})
                              </span>
                            ) : (
                              <span className="text-amber-700 font-extrabold flex items-center gap-1">
                                ⏳ Pontos App: Pendente (+{order.pointsEarned || 0} pts{order.pointsRedeemed ? `, -${order.pointsRedeemed} resgatados` : ""})
                              </span>
                            )}
                          </div>
                          {!order.pointsProcessed && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirmingOrderId === order.id) {
                                  onConfirmWhatsAppPurchase && onConfirmWhatsAppPurchase(order.id);
                                  setConfirmingOrderId(null);
                                } else {
                                  setConfirmingOrderId(order.id);
                                  // Auto reset after 5 seconds
                                  setTimeout(() => {
                                    setConfirmingOrderId(prev => prev === order.id ? null : prev);
                                  }, 5000);
                                }
                              }}
                              className={`w-full font-bold text-[9px] uppercase tracking-wider py-1 px-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                confirmingOrderId === order.id
                                  ? "bg-lime-400 hover:bg-lime-500 text-purple-950 border-lime-500 animate-pulse font-black"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-750"
                              }`}
                            >
                              {confirmingOrderId === order.id
                                ? "⚠️ Confirmar de Novo para Liberar!"
                                : "🚀 Concluído no WhatsApp (Liberar)"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs flex flex-col items-center justify-center gap-1 my-auto">
                    <span>🛒</span>
                    <span>Nenhum pedido real recebido ainda.</span>
                  </div>
                )}
              </div>
              
              <div className="text-[9px] text-gray-400 text-center border-t border-gray-100 pt-2 shrink-0">
                Os faturamentos são atualizados automaticamente a cada novo pedido finalizado.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏢 EMPRESA (COMPANY CONFIG) */}
      {activeTab === "company" && (
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 mb-2">
            <h3 className="font-display font-semibold text-sm text-brand-purple mb-1">Informações de Contato & Redes</h3>
            <p className="text-xs text-gray-500">Mude as coordenadas que aparecem na tela de início de forma instantânea.</p>
          </div>

          {/* Status de Funcionamento Toggle Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-800">Status de Funcionamento (Aberto / Fechado)</h4>
                <span className={`w-2.5 h-2.5 rounded-full ${companyForm.isOpen !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Se você fechar a loja, os clientes verão um aviso e a sacola/pedidos online serão desabilitados temporariamente.</p>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...companyForm, isOpen: true };
                  setCompanyForm(updated);
                  onUpdateCompanyInfo(updated);
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  companyForm.isOpen !== false
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                🟢 Aberto
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...companyForm, isOpen: false };
                  setCompanyForm(updated);
                  onUpdateCompanyInfo(updated);
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  companyForm.isOpen === false
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/25"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
              >
                🔴 Fechado
              </button>
            </div>
          </div>



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Nome da Açaíteria</label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">WhatsApp (Ex: (81) 99999-9999)</label>
              <input
                type="text"
                value={companyForm.whatsapp}
                onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                placeholder="Ex: (81) 99999-9999"
              />
              <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">O número será automaticamente limpo e convertido para o formato internacional de envio.</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Endereço Completo</label>
            <input
              type="text"
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Horário de Funcionamento (Texto)</label>
              <input
                type="text"
                value={companyForm.hours}
                onChange={(e) => setCompanyForm({ ...companyForm, hours: e.target.value })}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                placeholder="Ex: Todos os dias: 10h às 00h"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Instagram (@)</label>
              <input
                type="text"
                value={companyForm.instagram}
                onChange={(e) => setCompanyForm({ ...companyForm, instagram: e.target.value })}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
              />
            </div>
          </div>

          {/* CONFIGURAÇÃO DE HORÁRIOS SEMANAIS PERSONALIZADOS */}
          <div className="bg-purple-50/20 p-5 rounded-2xl border border-purple-150 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <span>⏰ Mural de Horários por Dia da Semana</span>
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-normal">
                Configure os horários de início e encerramento para cada dia específico. Caso não abra em um determinado dia, desmarque-o usando o botão correspondente.
              </p>
            </div>

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const config = currentWeeklyHours[day.key] || { isOpen: true, start: "10:00", end: "00:00" };
                return (
                  <div key={day.key} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                    config.isOpen
                      ? "bg-white border-gray-150 shadow-2xs"
                      : "bg-gray-50 border-gray-200 opacity-75"
                  }`}>
                    {/* Day label and Status */}
                    <div className="flex items-center gap-3">
                      <div className="w-24 shrink-0 text-left">
                        <span className="text-xs font-extrabold text-gray-800 uppercase tracking-tight">{day.label}</span>
                      </div>
                      
                      {/* Active Toggle Option (Não abrir / Aberto) */}
                      <button
                        type="button"
                        onClick={() => handleDayScheduleChange(day.key, "isOpen", !config.isOpen)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                          config.isOpen
                            ? "bg-lime-100 text-lime-900 border border-lime-200/50"
                            : "bg-rose-100 text-rose-950 border border-rose-200/50"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>{config.isOpen ? "🟢 Aberto" : "🔴 Não Abrir"}</span>
                      </button>
                    </div>

                    {/* Start / End Time Picker Inputs */}
                    <div className="flex items-center gap-2 sm:self-auto self-start">
                      {config.isOpen ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-gray-400 uppercase">Início:</span>
                            <input
                              type="time"
                              value={config.start}
                              onChange={(e) => handleDayScheduleChange(day.key, "start", e.target.value)}
                              className="text-xs font-semibold p-1.5 px-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple focus:bg-white text-gray-800"
                            />
                          </div>
                          
                          <span className="text-gray-300 text-xs font-light px-1">às</span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-gray-400 uppercase">Fim:</span>
                            <input
                              type="time"
                              value={config.end}
                              onChange={(e) => handleDayScheduleChange(day.key, "end", e.target.value)}
                              className="text-xs font-semibold p-1.5 px-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple focus:bg-white text-gray-800"
                            />
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-800 italic bg-rose-50 px-3 py-1 rounded-lg">
                          Sem expediente (Fechado)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Link do Google Maps</label>
            <input
              type="text"
              value={companyForm.mapsLink}
              onChange={(e) => setCompanyForm({ ...companyForm, mapsLink: e.target.value })}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
            />
          </div>

          {/* Configuração da Chave Pix */}
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>💸 Chave Pix para Recebimento</span>
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Informe a chave Pix da sua empresa. Ela será exibida no carrinho de compras e no recibo quando o método de pagamento Pix for selecionado.</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 block mb-1 uppercase tracking-wider">Chave Pix:</label>
              <input
                type="text"
                placeholder="Ex: CNPJ, E-mail, Celular, Chave Aleatória"
                value={companyForm.pixKey || ""}
                onChange={(e) => setCompanyForm({ ...companyForm, pixKey: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-emerald-600 font-semibold text-emerald-950"
              />
            </div>
          </div>

          {/* Configurações do Clube de Fidelidade */}
          <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <span>🎁 Regras do Clube de Fidelidade (Meta de Resgate)</span>
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Defina quantos pontos o cliente deve acumular para liberar o resgate de um Açaí de 500ml Inteiramente Grátis.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-48 shrink-0">
                <label className="text-[10px] font-bold text-gray-600 block mb-1 uppercase tracking-wider">Pontos para Ganhar Prêmio:</label>
                <div className="relative flex items-center font-sans">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    value={companyForm.loyaltyPointsTarget || 100}
                    onChange={(e) => setCompanyForm({ ...companyForm, loyaltyPointsTarget: Number(e.target.value) || 100 })}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple font-black text-purple-950"
                  />
                  <span className="absolute right-3 text-[10px] text-gray-400 font-extrabold">PTS</span>
                </div>
              </div>
              <div className="text-[11px] text-purple-900/80 leading-relaxed italic">
                💡 Por padrão, a meta para o prêmio de fidelidade é 100 pontos. Você pode customizar esse valor para aumentar ou diminuir de forma flexível (ex: 50, 80, 120, 150 pontos).
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageSelector
              label="Logomarca da Açaíteria (Cabeçalho & Rodapé)"
              value={companyForm.logo}
              onChange={(newLogo) => setCompanyForm({ ...companyForm, logo: newLogo })}
              presetType="logo"
            />
            <ImageSelector
              label="Banner Principal da Página Inicial (Home)"
              value={companyForm.bannerImage}
              onChange={(newBanner) => setCompanyForm({ ...companyForm, bannerImage: newBanner })}
              presetType="banner"
            />
          </div>

          <button
            type="submit"
            className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-bold px-5 py-3 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Salvar Alterações Institucionais
          </button>
        </form>
      )}

      {/* 🍎 PRODUTOS CRUDS */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="font-display font-semibold text-sm mb-3 text-brand-purple flex items-center gap-1.5">
              {editingProductId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingProductId ? "Editar Produto Cadastrado" : "Cadastrar Novo Produto de Açaí"}</span>
            </h3>

            <form onSubmit={editingProductId ? (e) => { e.preventDefault(); handleSaveEditProduct(); } : handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Ex: Açaí Turbinado Maltado"
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Categoria</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => {
                      const selectedCategory = e.target.value;
                      let updatedSizes = newProduct.sizes;
                      
                      // Se selecionar combos e o estado original estiver com as opções padrão de copos normais, vamos simplificar para uma variação de combo com preço antigo riscado
                      const isDefaultSizes = newProduct.sizes?.length === 2 && 
                        newProduct.sizes[0].size === "330ml" && 
                        newProduct.sizes[1].size === "500ml";
                        
                      if (selectedCategory === "combos" && isDefaultSizes) {
                        updatedSizes = [
                          { size: "Combo Único", price: 18.00, originalPrice: 24.00 }
                        ];
                      } else if (selectedCategory !== "combos" && (newProduct.sizes?.length === 1 && newProduct.sizes[0].size === "Combo Único")) {
                        updatedSizes = [
                          { size: "330ml", price: 15.00 },
                          { size: "500ml", price: 20.00 }
                        ];
                      }
                      
                      setNewProduct({ 
                        ...newProduct, 
                        category: selectedCategory as any,
                        sizes: updatedSizes
                      });
                    }}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                  >
                    <option value="tradicionais">Açaís Tradicionais</option>
                    <option value="gourmets">Açaís Gourmets</option>
                    <option value="combos">Combos Completos</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Descrição do Produto / Ingredientes</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Ex: Açaí, creme de avelã, leite em pó, paçoca bem farta"
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple h-20 resize-none"
                />
              </div>

              <ImageSelector
                label="Foto Principal do Açaí / Item de Venda"
                value={newProduct.image || ""}
                onChange={(newImg) => setNewProduct({ ...newProduct, image: newImg })}
                presetType="product"
              />

              <div className="flex items-center gap-2.5 bg-white/60 p-3 rounded-lg border border-gray-250">
                <input
                  type="checkbox"
                  id="product-active-toggle"
                  checked={newProduct.active !== false}
                  onChange={(e) => setNewProduct({ ...newProduct, active: e.target.checked })}
                  className="w-4 h-4 text-brand-purple border-gray-300 rounded focus:ring-brand-purple accent-brand-purple cursor-pointer"
                />
                <label htmlFor="product-active-toggle" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                  Produto Disponível / Ativo (Visível no cardápio para os clientes)
                </label>
              </div>

              <div className="flex flex-col gap-2 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="product-friday-toggle"
                    checked={!!newProduct.isFridayOnly}
                    onChange={(e) => setNewProduct({ ...newProduct, isFridayOnly: e.target.checked })}
                    className="w-4 h-4 text-purple-700 border-purple-300 rounded focus:ring-purple-500 accent-purple-700 cursor-pointer"
                  />
                  <label htmlFor="product-friday-toggle" className="text-xs font-extrabold text-purple-950 cursor-pointer select-none">
                    ⭐ Combo/Produto Especial da Promoção de Sexta-feira
                  </label>
                </div>
                <p className="text-[10px] text-purple-700 font-medium ml-6.5 leading-relaxed">
                  Ao ativar esta opção, este item só estará visível no cardápio de pedidos dos clientes às <strong>sextas-feiras</strong> (dia da promoção). Nos outros dias da semana, ele é ocultado automaticamente.
                </p>
              </div>

              {/* Dynamic Size Pricing configuration (Fully customizable sizes & prices) */}
              <div className="space-y-3.5 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-850">Preços e Variações</h4>
                    <p className="text-[10px] text-gray-500 font-medium select-none">Configure variações livres (ex: "300ml") ou adicione o Combo com valor de promoção e riscado.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSizeRow}
                    className="text-[10.5px] bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold px-2.5 py-1.5 rounded-lg border border-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Variação</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newProduct.sizes?.map((sizeObj, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2.5 bg-white p-2.5 rounded-xl border border-gray-200 items-center">
                      <div className="w-full sm:flex-1 space-y-0.5 text-left">
                        <span className="text-[9px] uppercase font-bold text-gray-400 font-mono tracking-wider">Identificação / Tamanho</span>
                        <input
                          type="text"
                          required
                          value={sizeObj.size}
                          onChange={(e) => handleUpdateSizeField(idx, "size", e.target.value)}
                          placeholder="Ex: 500ml ou Combo Casal"
                          className="w-full text-xs p-2 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:border-brand-purple font-semibold text-gray-850 text-left"
                        />
                      </div>

                      <div className="w-full sm:w-[120px] space-y-0.5 text-left">
                        <span className="text-[9px] uppercase font-bold text-gray-400 font-mono tracking-wider">De (Preço Original Riscado)</span>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-[10px] text-gray-400 font-bold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={sizeObj.originalPrice || ""}
                            onChange={(e) => handleUpdateSizeField(idx, "originalPrice", e.target.value)}
                            placeholder="Opcional"
                            className="w-full text-xs pl-6 p-2 bg-gray-55 rounded-lg border border-gray-200 outline-none focus:border-brand-purple text-gray-500 font-mono text-left"
                          />
                        </div>
                      </div>

                      <div className="w-full sm:w-[130px] space-y-0.5 text-left font-bold">
                        <span className="text-[9px] uppercase font-bold text-gray-400 font-mono tracking-wider">Por (Preço de Venda)</span>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-[10px] text-purple-750 font-extrabold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={sizeObj.price || ""}
                            onChange={(e) => handleUpdateSizeField(idx, "price", e.target.value)}
                            placeholder="0.00"
                            className="w-full text-xs pl-6 p-2 bg-purple-50/20 rounded-lg border border-purple-200 outline-none focus:border-brand-purple text-purple-900 font-mono font-bold text-left"
                          />
                        </div>
                      </div>

                      {sizeObj.originalPrice && sizeObj.originalPrice > sizeObj.price ? (
                        <div className="w-full sm:w-[80px] space-y-0.5 text-left font-bold">
                          <span className="text-[9px] uppercase font-bold text-gray-400 font-mono tracking-wider block">Desconto</span>
                          <div className="p-2 bg-purple-100 text-purple-900 border border-purple-250 rounded-lg text-xs font-black text-center font-mono">
                            -{Math.round(((sizeObj.originalPrice - sizeObj.price) / sizeObj.originalPrice) * 100)}%
                          </div>
                        </div>
                      ) : null}

                      {(newProduct.sizes?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSizeRow(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer mt-1.5 sm:mt-4"
                          title="Remover esta variação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {editingProductId ? "Atualizar Produto" : "Criar Produto"}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setNewProduct({
                        name: "",
                        description: "",
                        image: "",
                        category: "tradicionais",
                        sizes: [
                          { size: "330ml", price: 15.00 },
                          { size: "500ml", price: 20.00 }
                        ]
                      });
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of current products to Edit or Delete */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Produtos Cadastrados ({products.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p) => {
                const isActive = p.active !== false;
                return (
                  <div
                    key={p.id}
                    className={`border rounded-xl p-3 flex gap-3 items-center transition-all ${
                      isActive ? "bg-gray-50 border-gray-200" : "bg-gray-100/50 border-gray-300 border-dashed opacity-75"
                    }`}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-16 h-16 rounded-lg object-cover bg-gray-200 border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-brand-purple bg-purple-50 px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                        {isActive ? (
                          <span className="text-[10px] uppercase font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-150 px-1.5 py-0.5 rounded">
                            Inativo
                          </span>
                        )}
                        {p.isFridayOnly && (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-55 border border-amber-200 px-1.5 py-0.5 rounded">
                            📅 Combo Sexta
                          </span>
                        )}
                      </div>
                      <h5 className={`font-semibold text-sm truncate mt-1 ${isActive ? "" : "text-gray-500 line-through"}`}>{p.name}</h5>
                      <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-500 font-mono">
                        {p.sizes.map((s) => {
                          const hasDiscount = s.originalPrice && s.originalPrice > s.price;
                          const pct = hasDiscount ? Math.round(((s.originalPrice! - s.price) / s.originalPrice!) * 100) : 0;
                          return (
                            <span key={s.size} className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150 inline-flex items-center gap-1.5">
                              <span>{s.size}: {s.originalPrice ? `De R$ ${s.originalPrice.toFixed(2)} por R$ ${s.price.toFixed(2)}` : `R$ ${s.price.toFixed(2)}`}</span>
                              {hasDiscount && (
                                <span className="bg-purple-600 text-white text-[9px] px-1 rounded-sm font-black">
                                  -{pct}%
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleProductActive(p.id, p.active)}
                        className={`p-1.5 bg-white border border-gray-200 rounded transition-all ${
                          isActive
                            ? "text-gray-400 hover:border-amber-500 hover:text-amber-500"
                            : "text-brand-purple hover:border-green-500 hover:text-green-500"
                        }`}
                        title={isActive ? "Desativar Produto" : "Ativar Produto"}
                      >
                        {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditProduct(p)}
                        className="p-1.5 bg-white border border-gray-200 rounded hover:border-brand-purple hover:text-brand-purple transition-all text-gray-600"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 bg-white border border-gray-200 rounded hover:border-red-500 hover:text-red-500 transition-all text-gray-600"
                        title="Deletar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ VITRINE (MAX 30 IMAGES SLIDES) */}
      {activeTab === "vitrine" && (
        <div className="space-y-6">
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-display font-semibold text-sm text-brand-purple mb-1">Banners da Vitrine (Até 30 Imagens)</h3>
              <p className="text-xs text-gray-500 font-sans">Adicione seus próprios banners ou mude/exclua os existentes para destacar novidades.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-brand-purple hover:bg-brand-purple-light text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload de Banner</span>
              </button>
              <div className="bg-brand-purple/10 text-brand-purple font-mono font-bold text-xs px-2.5 py-1.5 rounded-lg">
                {vitrine.length} / 30
              </div>
            </div>
          </div>

          <form onSubmit={handleAddOrUpdateVitrine} className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 font-display">Título do Banner</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Taça Pistache Supremo de R$ 25"
                  value={newVitrine.title}
                  onChange={(e) => setNewVitrine({ ...newVitrine, title: e.target.value })}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 font-display">Breve Descrição / Chamada</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Disponível apenas hoje! Corra."
                  value={newVitrine.description}
                  onChange={(e) => setNewVitrine({ ...newVitrine, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                />
              </div>
            </div>

            <ImageSelector
              label="Foto do Slide de Vitrine (Tamanho Amplo)"
              value={newVitrine.image || ""}
              onChange={(newImg) => setNewVitrine({ ...newVitrine, image: newImg })}
              presetType="banner"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!editingVitrineId && vitrine.length >= 30}
                className="bg-brand-purple disabled:bg-gray-300 hover:bg-brand-purple-light text-white text-xs font-mono font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                {editingVitrineId ? "Salvar Alterações Slide" : "Adicionar Banner"}
              </button>
              {editingVitrineId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVitrineId(null);
                    setNewVitrine({ title: "", description: "", image: "" });
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* List of current showcase to manage */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Combos Vitrines Visíveis ({vitrine.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vitrine.map((v) => (
                <div key={v.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex gap-3 items-center">
                  <img
                    src={v.image || "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&q=80"}
                    alt={v.title}
                    className="w-16 h-16 rounded-lg object-cover bg-gray-200 border"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm truncate">{v.title}</h5>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{v.description}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditVitrine(v)}
                      className="p-1.5 bg-white border border-gray-200 rounded hover:border-brand-purple hover:text-brand-purple transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVitrine(v.id)}
                      className="p-1.5 bg-white border border-gray-200 rounded hover:border-red-500 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UPLOAD MODAL FOR VITRINE SLIDES */}
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg p-6 space-y-4 relative overflow-hidden text-left">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h3 className="font-display font-black text-purple-950 text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand-purple animate-pulse" />
                    <span>Upload de Novo Banner</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setNewVitrine({ title: "", description: "", image: "" });
                    }}
                    className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 font-bold transition-all cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 block">Título do Banner / Campanha</label>
                    <input
                      type="text"
                      required
                      value={newVitrine.title || ""}
                      onChange={(e) => setNewVitrine({ ...newVitrine, title: e.target.value })}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple"
                      placeholder="Ex: Combo Açaí Double Love"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 block">Texto Secundário / Oferta</label>
                    <input
                      type="text"
                      required
                      value={newVitrine.description || ""}
                      onChange={(e) => setNewVitrine({ ...newVitrine, description: e.target.value })}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple"
                      placeholder="Ex: Peça 1 Cup e leve o segundo com 50% de desconto"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <ImageSelector
                      label="Caminho do Banner (Pasta public)"
                      value={newVitrine.image || ""}
                      onChange={(newImg) => setNewVitrine({ ...newVitrine, image: newImg })}
                      presetType="banner"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setNewVitrine({ title: "", description: "", image: "" });
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newVitrine.title || !newVitrine.description || !newVitrine.image) {
                        alert("Por favor, preencha todos os campos e envie uma imagem!");
                        return;
                      }
                      if (vitrine.length >= 30) {
                        alert("Limite de 30 banners atingido.");
                        return;
                      }
                      const id = "vit-" + Date.now();
                      const newItem: VitrineItem = {
                        id,
                        title: newVitrine.title,
                        description: newVitrine.description,
                        image: newVitrine.image
                      };
                      onUpdateVitrine([...vitrine, newItem]);
                      setIsUploadModalOpen(false);
                      setNewVitrine({ title: "", description: "", image: "" });
                      alert("Banner adicionado na vitrine com sucesso!");
                    }}
                    className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-semibold px-5 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Confirmar Envio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📢 PROVAS SOCIAIS (SOCIAL PROOFS) */}
      {activeTab === "proofs" && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs uppercase font-bold text-gray-500 mb-3 tracking-wider">
              {editingSocialProofId ? "Editar Avaliação" : "Adicionar Prova Social / Depoimento de Clientes"}
            </h4>

            <form onSubmit={handleSaveSocialProof} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Nome do cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Amanda Albuquerque"
                    value={newSocialProof.name}
                    onChange={(e) => setNewSocialProof({ ...newSocialProof, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Instagram (@)</label>
                  <input
                    type="text"
                    required
                    placeholder="amanda_albu"
                    value={newSocialProof.instagram}
                    onChange={(e) => setNewSocialProof({ ...newSocialProof, instagram: e.target.value })}
                    className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="pb-2">
                <ImageSelector
                  label="Imagem do Print / Story do Cliente (Obrigatório)"
                  value={newSocialProof.storyImage || ""}
                  onChange={(storyImg) => setNewSocialProof({ ...newSocialProof, storyImage: storyImg })}
                  presetType="banner"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {editingSocialProofId ? "Salvar Avaliação" : "Cadastrar Depoimento"}
                </button>
                {editingSocialProofId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSocialProofId(null);
                      setNewSocialProof({ name: "", instagram: "", comment: "", rating: 5, image: DEFAULT_AVATAR_URL, storyImage: "" });
                    }}
                    className="bg-gray-250 hover:bg-gray-350 text-gray-700 text-xs px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">Depoimentos Visíveis ({socialProofs.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {socialProofs.map((sp) => (
                <div key={sp.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex gap-3 items-center">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-purple-100 text-purple-950 border border-purple-200 cursor-pointer shrink-0"
                    onClick={() => {
                      setEditingSocialProofId(sp.id);
                      setNewSocialProof({ ...sp });
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                  >
                    {sp.name ? sp.name.charAt(0).toUpperCase() : "👤"}
                  </div>
                  <div 
                    className="flex-1 min-w-0 cursor-pointer" 
                    onClick={() => {
                      setEditingSocialProofId(sp.id);
                      setNewSocialProof({ ...sp });
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 font-bold text-xs">
                      <span className="truncate">{sp.name}</span>
                      <span className="text-[10px] text-gray-500 font-normal">@{sp.instagram}</span>
                      {sp.storyImage && (
                        <span className="text-[8px] font-extrabold bg-purple-100 text-purple-900 border border-purple-150 px-1 py-0.2 rounded-full">
                          📸 Print Story
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-900/60 mt-1 italic font-sans">(Print do Story do Instagram)</p>
                  </div>

                  {sp.storyImage && (
                    <div className="w-12 h-16 rounded-md border border-gray-200 overflow-hidden shrink-0 bg-white shadow-2xs">
                      <img 
                        src={sp.storyImage} 
                        alt="Story print" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSocialProofId(sp.id);
                        setNewSocialProof({ ...sp });
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className="p-1 px-1.5 bg-white border border-gray-200 rounded text-purple-950 hover:bg-purple-50 transition-all font-bold text-[9px]"
                      title="Editar depoimento"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSocialProof(sp.id)}
                      className="p-1 px-1.5 bg-white border border-gray-200 rounded text-red-500 hover:bg-red-50 transition-all font-bold text-[9px]"
                      title="Remover depoimento"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ COMENTÁRIOS E PROMOÇÕES DA SEMANA */}
      {activeTab === "promos" && (
        <div className="space-y-6">
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-sm text-brand-purple mb-1">🎯 Gerenciador de Campanhas Diárias</h3>
              <p className="text-xs text-gray-500">
                Ative, desative, altere os textos e configure os parâmetros específicos de cada promoção diária.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {promos.map((p) => {
              const isMonday = p.id === "seg";
              const isTuesday = p.id === "ter";
              const isWednesday = p.id === "qua";
              const isThursday = p.id === "qui";
              const isFriday = p.id === "sex";

              return (
                <div key={p.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
                  {/* Indicator border for active promotion */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${p.active ? "bg-purple-600" : "bg-gray-300"}`} />
                  
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 pl-2 gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-display font-black text-sm text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 uppercase tracking-tight">
                        {p.id === "seg" ? "Desconto de 10%" :
                         p.id === "ter" ? "Toppings Grátis" :
                         p.id === "qua" ? "Frete Grátis" :
                         p.id === "qui" ? "Açaí em Dobro" :
                         p.id === "sex" ? "Combo Especial" :
                         p.id === "sab" ? "Sábado Supremo" :
                         "Domingão"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ativa na:</span>
                        <select
                          value={p.dayOfWeek || p.id}
                          onChange={(e) => {
                            const newDay = e.target.value as any;
                            const dayNamesMap: Record<string, string> = {
                              seg: "Segunda-feira",
                              ter: "Terça-feira",
                              qua: "Quarta-feira",
                              qui: "Quinta-feira",
                              sex: "Sexta-feira",
                              sab: "Sábado",
                              dom: "Domingo"
                            };
                            const updated = promos.map((prm) => {
                              if (prm.id === p.id) {
                                return {
                                  ...prm,
                                  dayOfWeek: newDay,
                                  dayName: dayNamesMap[newDay]
                                };
                              }
                              return prm;
                            });
                            onUpdatePromos(updated);
                          }}
                          className="text-xs p-1.5 bg-purple-50 border border-purple-200 rounded-lg outline-none text-brand-purple font-black focus:ring-1 focus:ring-brand-purple"
                        >
                          <option value="seg">Segunda-feira</option>
                          <option value="ter">Terça-feira</option>
                          <option value="qua">Quarta-feira</option>
                          <option value="qui">Quinta-feira</option>
                          <option value="sex">Sexta-feira</option>
                          <option value="sab">Sábado</option>
                          <option value="dom">Domingo</option>
                        </select>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${p.active ? "bg-emerald-100 text-emerald-850" : "bg-gray-100 text-gray-500"}`}>
                        {p.active ? "Ativa" : "Desativada"}
                      </span>
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={() => handleTogglePromo(p.id)}
                        className="rounded text-brand-purple focus:ring-brand-purple w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-600">Habilitar Promoção</span>
                    </label>
                  </div>

                  {/* Text properties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Selo / Mini Tag (Badge)</label>
                      <input
                        type="text"
                        defaultValue={p.badge}
                        id={`badge-${p.id}`}
                        placeholder="Ex: 10% OFF, GRÁTIS"
                        className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Título da Promoção</label>
                      <input
                        type="text"
                        defaultValue={p.title}
                        id={`title-${p.id}`}
                        placeholder="Título em destaque"
                        className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pl-2">
                    <label className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Descrição / Regulamento</label>
                    <input
                      type="text"
                      defaultValue={p.description}
                      id={`desc-${p.id}`}
                      placeholder="Regulamento ou detalhamento da oferta"
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
                    />
                  </div>

                  {/* -------------------- CONFIGURAÇÕES ESPECÍFICAS DE CADA DIA -------------------- */}
                  <div className="pl-2 pt-2 border-t border-gray-50 space-y-3">
                    
                    {/* SEGUNDA-FEIRA: 10% OFF */}
                    {isMonday && (
                      <div className="bg-purple-55/15 p-4 rounded-xl border border-purple-100/50 space-y-2">
                        <span className="text-xs font-black text-brand-purple flex items-center gap-1.5">
                          🏷️ Configuração da Segunda-feira (Desconto % em Todo Açaí)
                        </span>
                        <div className="flex items-center gap-3 max-w-xs">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            id="monday-discount-input"
                            defaultValue={p.mondayDiscountPercent || 10}
                            className="w-24 text-xs p-2 bg-white border border-gray-200 rounded-lg focus:border-brand-purple outline-none"
                          />
                          <span className="text-xs font-bold text-gray-600">% de desconto real no carrinho</span>
                        </div>
                      </div>
                    )}

                    {/* TERÇA-FEIRA: TOPPINGS GRÁTIS */}
                    {isTuesday && (
                      <div className="bg-purple-55/15 p-4 rounded-xl border border-purple-100/50 space-y-3">
                        <span className="text-xs font-black text-brand-purple flex items-center gap-1.5">
                          🍬 Configuração da Terça-feira (Toppings Grátis Habilitados)
                        </span>
                        
                        {/* Include new topping form */}
                        <div className="flex gap-2 max-w-md">
                          <input
                            type="text"
                            placeholder="Incluir novo topping grátis (Ex: KitKat)"
                            value={newToppingInput}
                            onChange={(e) => setNewToppingInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (!newToppingInput.trim()) return;
                                const updated = promos.map((prm) => {
                                  if (prm.id === "ter") {
                                    const currentList = prm.tuesdayToppings || [];
                                    if (currentList.includes(newToppingInput.trim())) {
                                      alert("Este topping já está incluído!");
                                      return prm;
                                    }
                                    return { ...prm, tuesdayToppings: [...currentList, newToppingInput.trim()] };
                                  }
                                  return prm;
                                });
                                onUpdatePromos(updated);
                                setNewToppingInput("");
                              }
                            }}
                            className="flex-1 text-xs p-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newToppingInput.trim()) return;
                              const updated = promos.map((prm) => {
                                if (prm.id === "ter") {
                                  const currentList = prm.tuesdayToppings || [];
                                  if (currentList.includes(newToppingInput.trim())) {
                                    alert("Este topping já está incluído!");
                                    return prm;
                                  }
                                  return { ...prm, tuesdayToppings: [...currentList, newToppingInput.trim()] };
                                }
                                return prm;
                              });
                              onUpdatePromos(updated);
                              setNewToppingInput("");
                            }}
                            className="bg-brand-purple hover:bg-purple-900 text-white font-extrabold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all"
                          >
                            Incluir
                          </button>
                        </div>

                        {/* List current toppings with exclude/delete option */}
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Toppings Oferecidos Grátis ({p.tuesdayToppings?.length || 0}):</label>
                          <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1 bg-white/40 border border-gray-100 rounded-lg">
                            {(p.tuesdayToppings || []).length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic p-1">Nenhum topping cadastrado. Adicione um acima!</p>
                            ) : (
                              (p.tuesdayToppings || []).map((topping) => (
                                <span key={topping} className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-950 font-semibold text-[11px] px-2.5 py-1 rounded-full border border-purple-200 shadow-3xs">
                                  {topping}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = promos.map((prm) => {
                                        if (prm.id === "ter") {
                                          return {
                                            ...prm,
                                            tuesdayToppings: (prm.tuesdayToppings || []).filter((t) => t !== topping)
                                          };
                                        }
                                        return prm;
                                      });
                                      onUpdatePromos(updated);
                                    }}
                                    className="text-purple-600 hover:text-red-650 cursor-pointer text-[12px] font-black transition-colors"
                                    title="Excluir Topping"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QUARTA-FEIRA: FRETE GRÁTIS */}
                    {isWednesday && (
                      <div className="bg-purple-55/15 p-4 rounded-xl border border-purple-100/50 space-y-3">
                        <span className="text-xs font-black text-brand-purple flex items-center gap-1.5">
                          🛵 Configuração da Quarta-feira (Entrega Grátis automática)
                        </span>
                        <p className="text-[11px] text-gray-500 leading-normal">
                          Esta promoção zera a taxa de entrega automaticamente no carrinho de compras para todos os clientes quando ativa na quarta-feira até o horário limite.
                        </p>
                        <div className="space-y-1 max-w-xs">
                          <label className="text-[10px] uppercase font-bold text-gray-400">Horário Limite do Frete Grátis:</label>
                          <input
                            type="time"
                            id="wednesday-limit-time"
                            defaultValue={p.wednesdayLimitTime || "18:00"}
                            className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:border-brand-purple outline-none"
                          />
                          <p className="text-[9px] text-gray-400">Ex: 18:00. Após este horário na quarta-feira, a promoção não será mais aplicada no carrinho.</p>
                        </div>
                      </div>
                    )}

                    {/* QUINTA-FEIRA: EM DOBRO */}
                    {isThursday && (
                      <div className="bg-purple-55/15 p-4 rounded-xl border border-purple-100/50 space-y-2">
                        <span className="text-xs font-black text-brand-purple flex items-center gap-1.5">
                          🍧 Configuração da Quinta-feira (Açaí em Dobro)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Na compra de um Açaí de:</label>
                            <input
                              type="text"
                              id="thursday-buy-size"
                              defaultValue={p.thursdayBuySize || "500ml"}
                              placeholder="Ex: 500ml"
                              className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Ganha outro de brinde de:</label>
                            <input
                              type="text"
                              id="thursday-get-size"
                              defaultValue={p.thursdayGetSize || "330ml"}
                              placeholder="Ex: 330ml"
                              className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SEXTA-FEIRA: COMBO ESPECIAL */}
                    {isFriday && (
                      <div className="bg-purple-55/15 p-4 rounded-xl border border-purple-100/50 space-y-3">
                        <span className="text-xs font-black text-brand-purple flex items-center gap-1.5">
                          🍹 Configuração da Sexta-feira (Combo Especial Decidido por Você)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Selecione o Combo do Cardápio:</label>
                            <select
                              id="friday-combo-id"
                              defaultValue={p.fridaySelectedProductId || "p13"}
                              className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                            >
                              {products.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                  [{prod.category.toUpperCase()}] {prod.name} (R$ {prod.sizes[0]?.price.toFixed(2)})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Preço Especial do Combo hoje (R$):</label>
                            <input
                              type="number"
                              step="0.01"
                              id="friday-combo-price"
                              defaultValue={p.fridaySpecialPrice || 31.90}
                              className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-purple"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pr-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const t = (document.getElementById(`title-${p.id}`) as HTMLInputElement).value;
                        const d = (document.getElementById(`desc-${p.id}`) as HTMLInputElement).value;
                        const b = (document.getElementById(`badge-${p.id}`) as HTMLInputElement).value;
                        
                        let extraData: Partial<PromoWeekDay> = {};
                        if (isMonday) {
                          const disc = Number((document.getElementById("monday-discount-input") as HTMLInputElement).value) || 10;
                          extraData = { mondayDiscountPercent: disc };
                        } else if (isWednesday) {
                          const limitTime = (document.getElementById("wednesday-limit-time") as HTMLInputElement).value || "18:00";
                          extraData = { wednesdayLimitTime: limitTime };
                        } else if (isThursday) {
                          const buy = (document.getElementById("thursday-buy-size") as HTMLInputElement).value || "500ml";
                          const get = (document.getElementById("thursday-get-size") as HTMLInputElement).value || "330ml";
                          extraData = { thursdayBuySize: buy, thursdayGetSize: get };
                        } else if (isFriday) {
                          const comboId = (document.getElementById("friday-combo-id") as HTMLSelectElement).value;
                          const comboPrice = Number((document.getElementById("friday-combo-price") as HTMLInputElement).value) || 29.99;
                          extraData = { fridaySelectedProductId: comboId, fridaySpecialPrice: comboPrice };
                        }

                        // Save updated day
                        const updated = promos.map((prm) => {
                          if (prm.id === p.id) {
                            return {
                              ...prm,
                              title: t,
                              description: d,
                              badge: b,
                              ...extraData
                            };
                          }
                          return prm;
                        });
                        onUpdatePromos(updated);
                        alert(`Promoção de ${p.dayName} salva com sucesso!`);
                      }}
                      className="bg-brand-purple hover:bg-purple-900 text-white font-extrabold text-[11px] px-5 py-2 rounded-xl cursor-pointer shadow-sm transition-all"
                    >
                      ✓ Salvar Configuração de {p.dayName}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 👥 LIST FIDELIDADE MEMBERS */}
      {activeTab === "loyalty" && (
        <div className="space-y-6">
          {/* 📊 INDICADORES DE DESEMPENHO DO PROGRAMA (DONO ESTATÍSTICA) */}
          {(() => {
            const mergedMap = new Map<string, { id: string; name: string; phone: string; points: number; isAppClient: boolean }>();

            clientUsers.forEach((client) => {
              const cleanPhone = client.phone.replace(/\D/g, "");
              if (!cleanPhone) return;
              mergedMap.set(cleanPhone, {
                id: client.id,
                name: client.name,
                phone: client.phone,
                points: client.points || 0,
                isAppClient: true,
              });
            });

            loyaltyUsers.forEach((lUser) => {
              const cleanPhone = lUser.phone.replace(/\D/g, "");
              if (!cleanPhone) return;
              if (mergedMap.has(cleanPhone)) {
                const existing = mergedMap.get(cleanPhone)!;
                existing.points = Math.max(existing.points, lUser.points || 0);
                existing.id = lUser.id || existing.id;
              } else {
                mergedMap.set(cleanPhone, {
                  id: lUser.id || `loy-${cleanPhone}`,
                  name: lUser.name,
                  phone: lUser.phone,
                  points: lUser.points || 0,
                  isAppClient: false,
                });
              }
            });

            const list = Array.from(mergedMap.values());
            const totalMembers = list.length;
            const totalPoints = list.reduce((sum, u) => sum + u.points, 0);
            const target = companyInfo.loyaltyPointsTarget || 100;
            const readyToRedeem = list.filter(u => u.points >= target).length;
            const appMembersCount = list.filter(u => u.isAppClient).length;
            const manualMembersCount = totalMembers - appMembersCount;

            const filteredList = list.filter((user) => {
              const cleanSearch = loyaltySearchQuery.toLowerCase().trim();
              const matchesSearch = !cleanSearch ||
                user.name.toLowerCase().includes(cleanSearch) ||
                user.phone.replace(/\D/g, "").includes(cleanSearch) ||
                user.phone.includes(cleanSearch);

              if (!matchesSearch) return false;

              if (loyaltyFilter === "ready") return user.points >= target;
              if (loyaltyFilter === "near") return user.points >= target * 0.7 && user.points < target;
              if (loyaltyFilter === "app") return user.isAppClient;
              if (loyaltyFilter === "manual") return !user.isAppClient;
              return true;
            });

            return (
              <div className="space-y-6">
                {/* 🎯 Kpis Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 text-brand-purple">
                      <User className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Total de Clientes</span>
                    </div>
                    <p className="text-2xl font-black text-brand-purple mt-1">{totalMembers}</p>
                    <div className="flex gap-2 text-[9px] text-gray-500 mt-1">
                      <span>📱 App: <strong>{appMembersCount}</strong></span>
                      <span>•</span>
                      <span>📝 Manual: <strong>{manualMembersCount}</strong></span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <Award className="w-4 h-4" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Brindes Disponíveis</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-800 mt-1">{readyToRedeem}</p>
                    <p className="text-[9px] text-emerald-700 font-medium mt-1">✓ Clientes já com {target}+ pts!</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Star className="w-4 h-4 text-amber-600" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Pontos em Circulação</span>
                    </div>
                    <p className="text-2xl font-black text-amber-800 mt-1">{totalPoints} <span className="text-xs font-normal">pts</span></p>
                    <p className="text-[9px] text-amber-700 font-medium mt-1">Méd: {totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0} pts por cliente</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-900">
                      <Tag className="w-4 h-4 text-indigo-700" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Meta do Programa</span>
                    </div>
                    <p className="text-2xl font-black text-indigo-900 mt-1">{target} <span className="text-xs font-normal">pts</span></p>
                    <p className="text-[9px] text-indigo-700 font-normal mt-1 flex items-center gap-0.5">Definido na aba Ajustes</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column: Register manual member */}
                  <div className="xl:col-span-1 space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-display font-bold text-base text-brand-purple">
                          Cadastrar Membro
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">Cadastre clientes que compram balcão/telefone diretamente no sistema de pontos.</p>
                      </div>

                      <form onSubmit={handleRegisterUserManual} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Nome Completo</label>
                          <input
                            type="text"
                            required
                            value={loyaltyForm.name}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, name: e.target.value })}
                            placeholder="Ex: Pedro Henrique"
                            className="w-full text-xs p-3 border border-gray-200 bg-gray-50/50 rounded-xl outline-none focus:border-brand-purple focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Telefone (DDD + WhatsApp)</label>
                          <input
                            type="tel"
                            required
                            value={loyaltyForm.phone}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, phone: e.target.value })}
                            placeholder="Ex: 11999999999"
                            className="w-full text-xs p-3 border border-gray-200 bg-gray-50/50 rounded-xl outline-none focus:border-brand-purple focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500">Pontos Iniciais</label>
                          <input
                            type="number"
                            value={loyaltyForm.points}
                            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, points: Number(e.target.value) })}
                            className="w-full text-xs p-3 border border-gray-200 bg-gray-50/50 rounded-xl outline-none focus:border-brand-purple focus:bg-white transition-all"
                          />
                          <p className="text-[9px] text-gray-400">A cada {target} pontos acumulados, o cliente ganha 🎁 1 Açaí Grátis.</p>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-3 bg-brand-purple hover:bg-brand-purple-light text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Registrar Cliente
                        </button>
                      </form>
                    </div>

                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-[11px] text-purple-950 space-y-2">
                       <h5 className="font-bold flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Regulamento Automatizado</h5>
                       <p className="text-gray-600 leading-relaxed">
                         O cálculo é cumulativo. Quando você confirma um resgate, o sistema remove {target} pontos do saldo do cliente, preservando pontos sobressalentes.
                       </p>
                    </div>
                  </div>

                  {/* Right Column: Beautiful points search & details overview list */}
                  <div className="xl:col-span-2 space-y-4">
                    {/* Header Controls inside right block */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <h4 className="font-display font-bold text-sm text-brand-purple flex items-center gap-1.5 self-start">
                          🔍 Busca e Filtros Avançados
                        </h4>
                        <span className="text-[10px] bg-purple-50 text-brand-purple px-2 py-1 rounded-full font-bold">
                          Exibindo {filteredList.length} de {totalMembers} membros
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6 relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            value={loyaltySearchQuery}
                            onChange={(e) => setLoyaltySearchQuery(e.target.value)}
                            placeholder="Buscar por nome, telefone ou Whatsapp..."
                            className="w-full text-xs pl-9 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-brand-purple focus:ring-1 focus:ring-purple-200 transition-all font-medium"
                          />
                        </div>

                        <div className="sm:col-span-6 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setLoyaltyFilter("all")}
                            className={`px-2.5 py-2 text-[10px] font-bold rounded-lg transition-all ${loyaltyFilter === "all" ? "bg-brand-purple text-white shadow-sm" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoyaltyFilter("ready")}
                            className={`px-2.5 py-2 text-[10px] font-bold rounded-lg transition-all ${loyaltyFilter === "ready" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100"}`}
                          >
                            🎁 Prontos ({list.filter(u => u.points >= target).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoyaltyFilter("near")}
                            className={`px-2.5 py-2 text-[10px] font-bold rounded-lg transition-all ${loyaltyFilter === "near" ? "bg-amber-500 text-white shadow-sm" : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-100"}`}
                          >
                            ⚡ Quase lá ({list.filter(u => u.points >= target * 0.7 && u.points < target).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoyaltyFilter("app")}
                            className={`px-2.5 py-2 text-[10px] font-bold rounded-lg transition-all ${loyaltyFilter === "app" ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
                          >
                            📱 App
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoyaltyFilter("manual")}
                            className={`px-2.5 py-2 text-[10px] font-bold rounded-lg transition-all ${loyaltyFilter === "manual" ? "bg-purple-600 text-white shadow-sm" : "bg-gray-100 hover:bg-gray-200 text-gray-500"}`}
                          >
                            📝 Balcão
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Member detailed layout cards */}
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {filteredList.length === 0 ? (
                        <div className="bg-white border rounded-2xl p-8 text-center text-xs text-gray-400 space-y-2">
                           <Search className="w-8 h-8 mx-auto text-gray-350" />
                           <p className="font-semibold text-gray-500">Nenhum membro do programa de fidelidade corresponde a este filtro.</p>
                           <p className="text-[10px] text-gray-400">Tente buscar por outro termo ou limpe os filtros de visualização.</p>
                           <button
                             type="button"
                             onClick={() => { setLoyaltySearchQuery(""); setLoyaltyFilter("all"); }}
                             className="text-xs text-brand-purple hover:underline font-bold"
                           >
                             Limpar Filtros
                           </button>
                        </div>
                      ) : (
                        filteredList.map((user) => {
                          const progressPct = Math.min(100, Math.floor((user.points / target) * 100));
                          const courtesiesAvailable = Math.floor(user.points / target);
                          const currentCyclePoints = user.points % target;
                          const pointsNeeded = Math.max(0, target - currentCyclePoints);
                          
                          // Custom user initial
                          const firstLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : "?";

                          return (
                            <div
                              key={user.phone}
                              className={`bg-white border rounded-2xl p-4.5 shadow-sm transition-all duration-300 ${
                                courtesiesAvailable > 0 
                                  ? "border-emerald-200 bg-emerald-50/[0.15] hover:border-emerald-350"
                                  : "border-gray-150 hover:border-brand-purple-light"
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Left Section: Avatar, Name & Phone */}
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm ${
                                    courtesiesAvailable > 0
                                      ? "bg-emerald-600 text-white ring-4 ring-emerald-50 animate-pulse"
                                      : "bg-gradient-to-br from-brand-purple to-purple-855 text-white"
                                  }`}>
                                    {firstLetter}
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-sm text-gray-950 leading-tight truncate max-w-[180px]">{user.name}</h5>
                                      <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                        user.isAppClient 
                                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                                          : "bg-purple-50 text-brand-purple border border-purple-200"
                                      }`}>
                                        {user.isAppClient ? "📱 App" : "📝 Balcão"}
                                      </span>
                                      
                                      {courtesiesAvailable > 0 && (
                                        <span className="bg-emerald-200 text-emerald-950 border border-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-bounce">
                                          🎁 {courtesiesAvailable} Grátis!
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                                      <span className="text-[10px]">📞 {user.phone}</span>
                                      <a
                                        href={`https://wa.me/55${user.phone.replace(/\D/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-700 hover:text-emerald-800 font-bold text-[9px] hover:underline"
                                      >
                                        WhatsApp
                                      </a>
                                    </div>
                                  </div>
                                </div>

                                {/* Center Section: Progress meter visualization */}
                                <div className="flex-1 min-w-[200px] space-y-1.5 bg-gray-50/50 p-2.5 rounded-xl border border-gray-150">
                                  <div className="flex justify-between text-[11px] font-semibold text-gray-700">
                                    <span className="flex items-center gap-1">
                                      Saldo Total: <strong className="text-brand-purple text-xs font-black">{user.points} pts</strong>
                                    </span>
                                    <span>{progressPct}% da meta</span>
                                  </div>
                                  
                                  {/* Progress bar container */}
                                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        courtesiesAvailable > 0
                                          ? "bg-emerald-500"
                                          : progressPct >= 70
                                            ? "bg-amber-450"
                                            : "bg-brand-purple"
                                      }`}
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>

                                  <div className="flex justify-between items-center text-[9px]">
                                    <span className="text-gray-500">
                                      {courtesiesAvailable > 0 
                                        ? `Excedente do ciclo: ${currentCyclePoints} / ${target} pts`
                                        : `Progresso: ${user.points} / ${target} pts`
                                      }
                                    </span>
                                    {pointsNeeded > 0 ? (
                                      <span className="text-brand-purple font-medium">Faltam {pointsNeeded} pts para o próximo açaí cortesia</span>
                                    ) : (
                                      <span className="text-emerald-700 font-bold">🎉 Ganhou 1 Cortesia Grátis!</span>
                                    )}
                                  </div>
                                </div>

                                {/* Right Section: Point Administration Action list */}
                                <div className="flex items-center gap-1.5 shrink-0 self-center md:self-auto justify-end">
                                  {/* Point adjustment controls */}
                                  <div className="flex flex-col gap-1.5 pr-2 border-r border-gray-150">
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustPoints(user.phone, 10)}
                                        className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[10px] font-extrabold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                        title="Adicionar 10 Pontos"
                                      >
                                        +10
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustPoints(user.phone, 50)}
                                        className="bg-purple-50 hover:bg-purple-100 text-brand-purple border border-purple-200 text-[10px] font-extrabold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                        title="Adicionar 50 Pontos"
                                      >
                                        +50
                                      </button>
                                    </div>
                                    <div className="flex gap-1 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (user.points >= 10) {
                                            handleAdjustPoints(user.phone, -10);
                                          } else {
                                            alert("O cliente já possui 0 pontos.");
                                          }
                                        }}
                                        className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                        title="Subtrair 10 Pontos"
                                      >
                                        -10 pts
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const pts = Number(prompt(`Quantos pontos deseja definir manualmente para o cliente ${user.name}?`, String(user.points)));
                                          if (!isNaN(pts) && pts >= 0) {
                                            const diff = pts - user.points;
                                            handleAdjustPoints(user.phone, diff);
                                          }
                                        }}
                                        className="bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                        title="Definir Valor Exato de Pontos"
                                      >
                                        Definir
                                      </button>
                                    </div>
                                  </div>

                                  {/* Resgate actions */}
                                  <div className="w-24 text-center shrink-0">
                                    {confirmingResgateId === user.phone ? (
                                      <div className="space-y-1 select-none">
                                        <p className="text-[8px] font-black text-emerald-800 leading-none">Confirmar?</p>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const amountToSubtract = user.points >= target ? target : user.points;
                                            handleAdjustPoints(user.phone, -amountToSubtract);
                                            setConfirmingResgateId(null);
                                          }}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black w-full py-1 rounded shadow-sm transition-all cursor-pointer"
                                          title={`Sacar 1 resgate (-${target} pts)`}
                                        >
                                          ✔ 1 Resgate
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleAdjustPoints(user.phone, -user.points);
                                            setConfirmingResgateId(null);
                                          }}
                                          className="bg-red-600 hover:bg-red-700 text-white text-[8px] font-bold w-full py-0.5 rounded transition-all cursor-pointer"
                                          title="Zerar todos os pontos"
                                        >
                                          Zerar Tudo
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmingResgateId(null)}
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-500 text-[7px] w-full py-0.5 rounded block text-center border font-bold cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (user.points >= target) {
                                            setConfirmingResgateId(user.phone);
                                          } else {
                                            alert(`Este cliente tem apenas ${user.points} pts. Ele precisa de no mínimo ${target} pontos para resgatar o açaí grátis.`);
                                          }
                                        }}
                                        className={`w-full py-2.5 rounded-xl text-center text-xs font-extrabold transition-all border ${
                                          user.points >= target
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow shadow-emerald-100 hover:translate-y-[-1px] animate-pulse cursor-pointer"
                                            : "bg-purple-50/55 hover:bg-purple-50 text-brand-purple border-purple-150 cursor-pointer"
                                        }`}
                                        title={`Marcar resgatado e deduzir pontos (${target} pontos)`}
                                      >
                                        🎁 Resgatar
                                      </button>
                                    )}
                                  </div>

                                  {/* Delete Loyalty Profile actions */}
                                  <div className="w-16 flex items-center justify-center border-l border-gray-150 pl-2">
                                    {deletingLoyaltyPhone === user.phone ? (
                                      <div className="space-y-1 text-center w-full select-none">
                                        <p className="text-[8px] font-black text-red-700 leading-none">Excluir?</p>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (onDeleteLoyaltyUser) {
                                              onDeleteLoyaltyUser(user.phone);
                                            }
                                            setDeletingLoyaltyPhone(null);
                                          }}
                                          className="bg-red-650 hover:bg-red-700 text-white text-[8px] font-black w-full py-1 rounded transition-all cursor-pointer"
                                          title="Deletar permanentemente"
                                        >
                                          Sim
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeletingLoyaltyPhone(null)}
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-500 text-[8px] w-full py-0.5 rounded border font-bold cursor-pointer"
                                        >
                                          Não
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setDeletingLoyaltyPhone(user.phone)}
                                        className="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                        title="Excluir Cliente Permanentemente"
                                      >
                                        <Trash2 className="w-4.5 h-4.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 👥 CLIENT USERS MANAGEMENT TAB */}
      {activeTab === "clients" && (
        <div className="space-y-6">
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-sm text-brand-purple">Gerenciamento de Clientes</h3>
              <p className="text-xs text-gray-500">Monitore usuários registrados, bloqueie contas suspeitas ou ajuste bônus.</p>
            </div>
            <span className="bg-brand-purple text-white text-xs font-bold px-3 py-1 rounded-full">
              {clientUsers.length} Cadastros
            </span>
          </div>

          {/* 📢 DISPARO AUTOMÁTICO DE PROMOÇÕES & COMUNICADOS */}
          <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-purple-50 pb-3">
              <span className="text-xl">📢</span>
              <div>
                <h4 className="font-display font-bold text-sm text-purple-900">Campanhas e Disparo de Promoções Automáticas</h4>
                <p className="text-[11px] text-gray-500">
                  Selecione um botão de modelo inteligente ou escreva abaixo para disparar novidades e promoções do dia para todos os clientes ativos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Template Selection and input */}
              <form onSubmit={handleBroadcastCampaign} className="lg:col-span-7 space-y-3.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-900 block mb-2">Modelos de Mensagem do Dia:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => generateTemplateText("current_day")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        selectedTemplate === "current_day"
                          ? "bg-purple-900 border-purple-900 text-white shadow-3xs"
                          : "bg-purple-50 border-purple-100 text-purple-950 hover:bg-purple-100"
                      }`}
                    >
                      🌟 Promoção de Hoje ({new Date().toLocaleDateString("pt-BR", { weekday: "short" })})
                    </button>
                    <button
                      type="button"
                      onClick={() => generateTemplateText("all_promos")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        selectedTemplate === "all_promos"
                          ? "bg-purple-900 border-purple-900 text-white shadow-3xs"
                          : "bg-purple-50 border-purple-100 text-purple-950 hover:bg-purple-100"
                      }`}
                    >
                      🍧 Ver Todas Promoções Ativas
                    </button>
                    <button
                      type="button"
                      onClick={() => generateTemplateText("loyalty_incentive")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        selectedTemplate === "loyalty_incentive"
                          ? "bg-purple-900 border-purple-900 text-white shadow-3xs"
                          : "bg-purple-50 border-purple-100 text-purple-950 hover:bg-purple-100"
                      }`}
                    >
                      🎁 Quase Ganhando Prêmio (Incentivar)
                    </button>
                    <button
                      type="button"
                      onClick={() => generateTemplateText("birthday")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        selectedTemplate === "birthday"
                          ? "bg-purple-900 border-purple-900 text-white shadow-3xs"
                          : "bg-purple-50 border-purple-100 text-purple-950 hover:bg-purple-100"
                      }`}
                    >
                      🎂 Feliz Aniversário!
                    </button>
                    <button
                      type="button"
                      onClick={() => generateTemplateText("custom")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                        selectedTemplate === "custom"
                          ? "bg-purple-900 border-purple-900 text-white shadow-3xs"
                          : "bg-purple-50 border-purple-100 text-purple-950 hover:bg-purple-100"
                      }`}
                    >
                      ✍️ Texto Livre (Limpar)
                    </button>
                  </div>
                </div>

                {/* 🎯 AUDIENCE SEGMENTATION OPTIONS */}
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-black text-purple-950 block">🎯 Segmento do Público-Alvo:</span>
                    <span className="text-[9px] bg-purple-100 text-purple-950 px-2 py-0.5 rounded-full font-bold">
                      {getFilteredCampaignClients().length} clientes elegíveis
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetAudience("all")}
                      className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        targetAudience === "all"
                          ? "bg-purple-950 text-white shadow-xs"
                          : "bg-white border-purple-100 text-purple-950 hover:bg-purple-100/40"
                      }`}
                    >
                      👥 Todos Clientes ({clientUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetAudience("near_prize");
                        if (selectedTemplate === "custom" || selectedTemplate === "current_day") {
                          generateTemplateText("loyalty_incentive");
                        }
                      }}
                      className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        targetAudience === "near_prize"
                          ? "bg-purple-950 text-white shadow-xs"
                          : "bg-white border-purple-100 text-purple-950 hover:bg-purple-100/40"
                      }`}
                    >
                      🧁 Quase Ganhando Prêmio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetAudience("birthday_today");
                        generateTemplateText("birthday");
                      }}
                      className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        targetAudience === "birthday_today"
                          ? "bg-purple-950 text-white shadow-xs"
                          : "bg-white border-purple-100 text-purple-950 hover:bg-purple-100/40"
                      }`}
                    >
                      🎂 Aniversariando Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetAudience("birthday_month");
                        generateTemplateText("birthday");
                      }}
                      className={`flex-1 min-w-[120px] py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border text-center ${
                        targetAudience === "birthday_month"
                          ? "bg-purple-950 text-white shadow-xs"
                          : "bg-white border-purple-100 text-purple-950 hover:bg-purple-100/40"
                      }`}
                    >
                      🗓️ Do Mês
                    </button>
                  </div>

                  {targetAudience === "near_prize" && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1.5 border-t border-purple-100/40">
                      <span className="text-[10px] font-bold text-purple-900 uppercase shrink-0">Máximo de Pontos Restantes:</span>
                      <select
                        value={pointsThreshold}
                        onChange={(e) => setPointsThreshold(Number(e.target.value))}
                        className="text-[11px] p-1 bg-white border border-purple-150 rounded text-purple-950 outline-none focus:ring-1 focus:ring-purple-900 font-bold max-w-[170px]"
                      >
                        <option value={10}>Faltam até 10 pontos</option>
                        <option value={20}>Faltam até 20 pontos</option>
                        <option value={30}>Faltam até 30 pontos (Padrão)</option>
                        <option value={40}>Faltam até 40 pontos</option>
                        <option value={50}>Faltam até 50 pontos</option>
                      </select>
                      <span className="text-[9px] text-purple-900/80 leading-relaxed italic block">
                        Alvos: Clientes com saldo de {(companyInfo.loyaltyPointsTarget || 100) - pointsThreshold} a {(companyInfo.loyaltyPointsTarget || 100) - 1} pontos (Meta: {companyInfo.loyaltyPointsTarget || 100} pontos).
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500 flex-wrap gap-1">
                    <label>Conteúdo do Comunicado:</label>
                    <div className="flex gap-1 items-center flex-wrap">
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded hover:bg-purple-50 hover:text-purple-900 transition-all cursor-help" title="Substituído pelo primeiro nome do cliente">[NOME]</span>
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded hover:bg-purple-50 hover:text-purple-900 transition-all cursor-help" title="Substituído pela pontuação atual do cliente">[PONTOS]</span>
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.2 rounded hover:bg-purple-50 hover:text-purple-900 transition-all cursor-help" title={`Substituído pelos pontos restantes para ${companyInfo.loyaltyPointsTarget || 100}`}>[RESTANTE]</span>
                      <span className="font-mono text-gray-300">|</span>
                      <span className={`${promoMessage.length > 250 ? "text-amber-600" : "text-gray-400"}`}>
                        {promoMessage.length} caracteres
                      </span>
                    </div>
                  </div>
                  <textarea
                    required
                    placeholder="Escreva ou escolha um modelo acima para enviar automaticamente..."
                    value={promoMessage}
                    onChange={(e) => {
                      setSelectedTemplate("custom");
                      setPromoMessage(e.target.value);
                    }}
                    rows={4}
                    className="w-full text-xs p-3 border border-gray-200 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-brand-purple focus:border-brand-purple leading-relaxed resize-none font-sans text-gray-900"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  {/* Select status badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Selo de Alerta:</span>
                    <div className="flex rounded-md border border-gray-255 bg-gray-50 p-0.5 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedCampaignStatus("Promoção")}
                        className={`px-2 py-1 text-[10px] font-black rounded ${
                          selectedCampaignStatus === "Promoção"
                            ? "bg-purple-900 text-white"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        🔥 PROMOÇÃO
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCampaignStatus("Geral")}
                        className={`px-2 py-1 text-[10px] font-black rounded ${
                          selectedCampaignStatus === "Geral"
                            ? "bg-purple-900 text-white"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        📢 GERAL
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingCampaign || !promoMessage.trim()}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      isSendingCampaign
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-brand-purple hover:bg-brand-purple-light text-white"
                    }`}
                  >
                    {isSendingCampaign ? (
                      <>
                        <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        <span>Enviando Campanha...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Disparar Comunicado via App</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Right Column: Broadcast simulation log console */}
              <div className="lg:col-span-5 bg-purple-950 text-purple-100 rounded-xl p-3.5 font-mono text-[10px] flex flex-col h-56 border border-purple-900/60 shadow-inner">
                <div className="flex justify-between items-center text-purple-300 font-bold border-b border-purple-900/60 pb-1.5 mb-2 shrink-0">
                  <span>🖥️ AUDITORIA DE DISPAROS</span>
                  <span className="animate-pulse bg-purple-900 text-[8px] px-1.5 py-0.2 rounded-full uppercase leading-none font-sans font-black tracking-wider">
                    {isSendingCampaign ? "Em Execução" : "Pronto para Transmissão"}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                  {campaignLogs.length === 0 ? (
                    <div className="text-purple-400/50 flex flex-col items-center justify-center h-full text-center py-4 space-y-2">
                      <span className="text-base">📡</span>
                      <span>Nenhum log gerado. Dispare a promoção para enviar alertas em lote.</span>
                    </div>
                  ) : (
                    campaignLogs.map((log, lIdx) => (
                      <div key={lIdx} className="leading-tight break-words">
                        <span className="text-purple-400">[{log.time}]</span>{" "}
                        <span className={log.type === "success" ? "text-emerald-400 font-semibold" : log.type === "info" ? "text-purple-300" : "text-purple-100"}>
                          {log.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b font-semibold text-xs hidden md:grid grid-cols-12 text-gray-500">
              <div className="col-span-3">Nome do Cliente</div>
              <div className="col-span-3">Canais de Contato</div>
              <div className="col-span-2 text-center">Fidelidade</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Ações de Controle</div>
            </div>

            <div className="divide-y divide-gray-100">
              {clientUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">Nenhum cliente cadastrado no site ainda.</div>
              ) : (
                clientUsers.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 hover:bg-gray-50/85 transition-all ${
                      client.blocked ? "bg-red-50/30" : ""
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                      
                      {/* Name & Birthday - col-span-3 */}
                      <div className="md:col-span-3 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-gray-950 text-sm leading-tight break-all">{client.name}</p>
                          {client.blocked && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider block md:hidden">
                              Suspenso
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Desde: {client.createdAt}</p>
                        
                        {/* Birthday selector */}
                        <div className="pt-0.5">
                          {client.birthday ? (
                            <button
                              type="button"
                              onClick={() => {
                                const newB = window.prompt(`Alterar aniversário de ${client.name} (Formato: AAAA-MM-DD, ex: 1990-12-31):`, client.birthday);
                                if (newB !== null) {
                                  const updated = clientUsers.map((u) => u.id === client.id ? { ...u, birthday: newB || undefined } : u);
                                  setClientUsers(updated);
                                  saveClientUsers(updated);
                                }
                              }}
                              className="text-[10px] text-purple-900 font-bold flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none text-left" 
                              title="Clique para alterar a data de nascimento"
                            >
                              <span className="text-xs shrink-0">🎂</span> {(() => {
                                const parts = client.birthday.split("-");
                                if (parts.length >= 3) {
                                  return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                }
                                return client.birthday;
                              })()}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const newB = window.prompt(`Definir aniversário de ${client.name} (Formato: AAAA-MM-DD, ex: 1990-12-31):`);
                                if (newB !== null && newB.trim() !== "") {
                                  const updated = clientUsers.map((u) => u.id === client.id ? { ...u, birthday: newB } : u);
                                  setClientUsers(updated);
                                  saveClientUsers(updated);
                                }
                              }}
                              className="text-[10px] text-gray-400 font-medium flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none italic text-left" 
                              title="Clique para cadastrar data de nascimento"
                            >
                              <span className="text-xs shrink-0">🎂</span> Add Niver
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contacts & Channels - col-span-3 */}
                      <div className="md:col-span-3 space-y-1">
                        <p className="text-xs text-gray-600 font-medium break-all">{client.email || "Sem e-mail cadastrado"}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-gray-500 font-mono font-semibold text-[11px]">{client.phone}</p>
                          {client.phone && (
                            <a
                              href={`https://wa.me/55${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                promoMessage
                                  ? getCustomizedMessageForClient(promoMessage, client)
                                  : `Olá, ${client.name}! Temos ofertas maravilhosas esperando por você hoje na nossa Açaíteria. Acesse nosso painel para conferir as promoções do dia e ver seu saldo de pontos Club! 🥤💜`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-md font-sans text-[10px] font-bold inline-flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                              title="Mandar mensagem atual ou convite de promoção para o WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>Mandar Promo</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Loyalty - col-span-2 */}
                      <div className="md:col-span-2 flex flex-col items-center justify-center gap-1 bg-purple-50/40 p-2 rounded-xl border border-purple-100/30 md:bg-transparent md:border-none md:p-0">
                        <span className="text-[9px] font-bold text-purple-900 uppercase block md:hidden mb-1">Fidelidade:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-purple-100 text-brand-purple font-black px-2.5 py-0.5 rounded-full text-[10px] shadow-3xs">
                            {client.points} pontos
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = clientUsers.map((u) =>
                                u.id === client.id ? { ...u, points: u.points + 10 } : u
                              );
                              setClientUsers(updated);
                              saveClientUsers(updated);
                            }}
                            className="bg-white border border-gray-200 hover:bg-gray-100 text-[10px] px-2 py-0.5 rounded-md font-extrabold text-gray-700 shadow-3xs transition-colors cursor-pointer"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = clientUsers.map((u) =>
                                u.id === client.id ? { ...u, points: Math.max(0, u.points - 10) } : u
                              );
                              setClientUsers(updated);
                              saveClientUsers(updated);
                            }}
                            className="bg-white border border-gray-200 hover:bg-gray-100 text-[10px] px-2 py-0.5 rounded-md font-extrabold text-gray-700 shadow-3xs transition-colors cursor-pointer"
                          >
                            -10
                          </button>
                        </div>
                        
                        {client.points >= (companyInfo.loyaltyPointsTarget || 100) && (
                          <div className="w-full mt-1.5 max-w-[140px]">
                            {confirmingResgateId === client.id ? (
                              <div className="flex flex-col gap-1 select-none animate-pulse">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = clientUsers.map((u) =>
                                      u.id === client.id ? { ...u, points: 0 } : u
                                    );
                                    setClientUsers(updated);
                                    saveClientUsers(updated);
                                    onUpdateLoyaltyPoints(client.phone, -client.points);
                                    setConfirmingResgateId(null);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-extrabold py-1 px-2 rounded-lg transition-all leading-tight text-center cursor-pointer shadow-3xs"
                                >
                                  ✔ Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingResgateId(null)}
                                  className="bg-white hover:bg-gray-100 text-gray-700 text-[9px] py-1 px-2 rounded-lg transition-all leading-tight text-center border font-extrabold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingResgateId(client.id);
                                }}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[9px] font-black px-2 py-1 rounded-lg transition-all text-center animate-pulse cursor-pointer w-full"
                                title="Confirmar Resgate de Açaí Grátis e Zerar Pontos"
                              >
                                🎁 Resgatar
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status - col-span-2 */}
                      <div className="md:col-span-2 text-center flex items-center justify-center gap-1 md:block bg-gray-50/40 p-1.5 rounded-xl border border-gray-100 md:bg-transparent md:border-none md:p-0">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block md:hidden mr-1">Status:</span>
                        {client.blocked ? (
                          <span className="bg-red-100 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                            Suspenso
                          </span>
                        ) : (
                          <span className="bg-lime-100 text-lime-800 font-extrabold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                            Ativo
                          </span>
                        )}
                      </div>

                      {/* Actions - col-span-2 */}
                      <div className="md:col-span-2 flex items-center justify-center md:justify-end gap-1.5 pt-2 border-t border-gray-100 md:border-none md:pt-0 shrink-0">
                        {client.blocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = clientUsers.map((u) =>
                                u.id === client.id ? { ...u, blocked: false } : u
                              );
                              setClientUsers(updated);
                              saveClientUsers(updated);
                            }}
                            className="px-2 py-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-150 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer"
                            title="Reativar Acesso"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> <span>Reativar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (blockingClientId === client.id) {
                                const updated = clientUsers.map((u) =>
                                  u.id === client.id ? { ...u, blocked: true } : u
                                );
                                setClientUsers(updated);
                                saveClientUsers(updated);
                                setBlockingClientId(null);
                              } else {
                                setBlockingClientId(client.id);
                                setDeletingClientId(null);
                                setTimeout(() => {
                                  setBlockingClientId(prev => prev === client.id ? null : prev);
                                }, 4000);
                              }
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-0.5 border cursor-pointer shrink-0 ${
                              blockingClientId === client.id
                                ? "text-white bg-red-600 border-red-700 animate-pulse"
                                : "text-red-700 bg-red-50 border-red-150 hover:bg-red-100"
                            }`}
                            title="Suspender Acesso"
                          >
                            <UserX className="w-3.5 h-3.5" /> 
                            <span>{blockingClientId === client.id ? "Confirmar?" : "Bloquear"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingClient(client)}
                          className="px-2 py-1 text-[10px] font-bold text-brand-purple bg-purple-50 border border-purple-150 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer shrink-0"
                          title="Editar Informações do Cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (deletingClientId === client.id) {
                              const updated = clientUsers.filter((u) => u.id !== client.id);
                              setClientUsers(updated);
                              saveClientUsers(updated);
                              setDeletingClientId(null);
                            } else {
                              setDeletingClientId(client.id);
                              setBlockingClientId(null);
                              setTimeout(() => {
                                setDeletingClientId(prev => prev === client.id ? null : prev);
                              }, 4000);
                            }
                          }}
                          className={`p-1.5 transition-all cursor-pointer border rounded-lg shrink-0 ${
                            deletingClientId === client.id
                              ? "text-white bg-red-600 border-red-750 animate-bounce"
                              : "text-gray-400 hover:text-red-600 bg-white hover:bg-gray-50"
                          }`}
                          title={deletingClientId === client.id ? "Clique de novo para Excluir permanentemente!" : "Excluir Conta"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔮 INCENTIVO FIDELIDADE TAB */}
      {activeTab === "incentivo_fidelidade" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
                <h3 className="font-display font-black text-lg">Acelerar & Incentivar Resgates</h3>
              </div>
              <p className="text-xs text-purple-200 mt-1 max-w-xl">
                Identifique instantaneamente os clientes cadastrados mais próximos de atingir a meta de pontos 
                ({companyInfo.loyaltyPointsTarget || 100} pts) para resgatar o prêmio e envie um incentivo via aplicativo ou WhatsApp de forma automatizada!
              </p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center min-w-[100px]">
                <span className="block text-[10px] text-purple-200 font-bold uppercase">Cadastros</span>
                <span className="text-xl font-black">{clientUsers.length}</span>
              </div>
              <div className="bg-amber-500/20 p-3 rounded-xl border border-amber-500/30 text-center min-w-[100px]">
                <span className="block text-[10px] text-amber-200 font-bold uppercase">Quase Lá</span>
                <span className="text-xl font-black text-amber-300">
                  {clientUsers.filter(c => {
                    const target = companyInfo.loyaltyPointsTarget || 100;
                    return (c.points || 0) >= (target - incentivePointsThreshold) && (c.points || 0) < target;
                  }).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Definição de Proximidade (Margem)</span>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 font-sans">Faltando no máximo:</label>
                <select
                  value={incentivePointsThreshold}
                  onChange={(e) => setIncentivePointsThreshold(Number(e.target.value))}
                  className="text-xs p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-purple-950 font-bold focus:ring-1 focus:ring-brand-purple outline-none"
                >
                  <option value={10}>Faltam até 10 pontos</option>
                  <option value={20}>Faltam até 20 pontos</option>
                  <option value={30}>Faltam até 30 pontos (Recomendado)</option>
                  <option value={40}>Faltam até 40 pontos</option>
                  <option value={50}>Faltam até 50 pontos</option>
                </select>
                <span className="text-xs text-gray-500 font-medium font-sans">pontos para atingir os <b>{companyInfo.loyaltyPointsTarget || 100} pts</b></span>
              </div>
            </div>

            <div className="text-[10px] text-gray-400 bg-gray-50 p-2.5 rounded-xl border max-w-sm leading-relaxed self-start font-sans">
              💡 <b>Notificação de Incentivo:</b> Envie um comunicado push instantâneo no aplicativo que aparecerá na barra de notificações do cliente ou use a mensagem de WhatsApp direcionada para incentivá-lo a fazer mais uma compra!
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-gray-50 border-b font-bold text-xs text-gray-500 grid grid-cols-12 gap-4 hidden md:grid">
              <div className="col-span-4">Cliente</div>
              <div className="col-span-4 text-center">Progresso & Pontos</div>
              <div className="col-span-4 text-right">Enviar Notificação / Incentivo</div>
            </div>

            <div className="divide-y divide-gray-100 font-sans">
              {(() => {
                const target = companyInfo.loyaltyPointsTarget || 100;
                const candidates = clientUsers.filter(c => {
                  const pts = c.points || 0;
                  return pts >= (target - incentivePointsThreshold) && pts < target;
                });

                if (candidates.length === 0) {
                  return (
                    <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                      <span className="text-4xl text-gray-300">🍧</span>
                      <p className="text-sm font-bold text-gray-650">Nenhum cliente nessa faixa de pontuação.</p>
                      <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                        Todos os clientes cadastrados estão com menos de {target - incentivePointsThreshold} pontos ou já completaram o saldo de resgate! Tente aumentar a margem se desejar ver mais pessoas.
                      </p>
                    </div>
                  );
                }

                return candidates.map(client => {
                  const remaining = target - client.points;
                  const pct = Math.min(100, Math.round((client.points / target) * 100));
                  
                  return (
                    <div key={client.id} className="p-4 text-xs hover:bg-gray-50/50 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                        
                        <div className="md:col-span-4 space-y-1">
                          <div className="font-extrabold text-sm text-gray-950 flex items-center gap-1.5 flex-wrap">
                            <span>{client.name}</span>
                            <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase leading-none">
                              Quase Lá
                            </span>
                          </div>
                          <p className="text-gray-500 monospace font-semibold text-[11px]">{client.phone}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Cadastrado desde {client.createdAt}</p>
                        </div>

                        <div className="md:col-span-4 space-y-1.5 self-center bg-purple-50/30 p-2.5 rounded-xl border border-purple-100/30 md:bg-transparent md:border-none md:p-0">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            <span className="text-brand-purple">{client.points} / {target} pontos</span>
                            <span className="text-amber-600 monospace">{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-150 rounded-full h-2 overflow-hidden border border-gray-100">
                            <div 
                              className="bg-gradient-to-r from-brand-purple to-amber-500 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-semibold text-amber-700 text-center leading-relaxed">
                            🍧 Faltam apenas {remaining} pontos para resgatar!
                          </p>
                        </div>

                        <div className="md:col-span-4 flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-gray-100 md:border-none md:pt-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const pushMsg = `🎁 CLUB FIDELIDADE: Parabéns ${client.name.split(" ")[0]}! Você tem ${client.points} pontos e está quase lá! Faltam apenas ${remaining} pts para você resgatar seu AÇAÍ DE 500ML Inteiramente Grátis! 💜🍧 Faça seu pedido hoje e garanta seu prêmio!`;
                              onAddGlobalNotification(pushMsg, "Promoção");
                              
                              const logTime = new Date().toLocaleTimeString();
                              setCampaignLogs(prev => [
                                { time: logTime, text: `✓ Push App enviado para ${client.name} (${client.phone})`, type: "success" },
                                ...prev
                              ]);
                            }}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-[10px] font-black text-white bg-brand-purple hover:bg-brand-purple-light transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Push App</span>
                          </button>

                          <a
                            href={`https://wa.me/55${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Olá ${client.name.split(" ")[0]}! Notamos que você já acumulou ${client.points} pontos no Clube de Fidelidade do Açaí! 😍💜\n\nFaltam apenas ${remaining} pontos para você liberar o seu Açaí de 500ml Inteiramente GRÁTIS! 🍧✨\n\nQue tal montar o seu açaí gelado e cremoso favorito de hoje e já carimbar o seu resgate gratuito? Esperamos pelo seu pedido!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              const logTime = new Date().toLocaleTimeString();
                              setCampaignLogs(prev => [
                                { time: logTime, text: `📡 Link WhatsApp gerado para ${client.name} - ${client.phone}`, type: "whatsapp" },
                                ...prev
                              ]);
                            }}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-[10px] font-black text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>WhatsApp</span>
                          </a>
                        </div>

                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 🔐 CONFIGURAÇÕES DE ACESSO & SEGURANÇA */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h3 className="font-display font-bold text-sm text-brand-purple flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-purple" />
              Segurança do Painel Administrativo
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Aqui você pode atualizar o e-mail ou a senha requerida para acessar esta área restrita de controle da sua açaíteria. As mudanças são salvas de forma persistente.
            </p>
          </div>

          {settingsSuccess && (
            <div className="bg-green-50 border border-green-150 text-green-700 font-bold p-3.5 rounded-xl text-xs flex items-center gap-2">
              <span className="text-sm">✔</span>
              <span>{settingsSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-650 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> Novo E-mail do Administrador
              </label>
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple font-medium"
                placeholder="exemplo@gmail.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-650 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-gray-400" /> Nova Senha do Administrador
              </label>
              <input
                type="text"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple font-mono font-semibold"
                placeholder="Mínimo 4 caracteres"
                required
                minLength={4}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-4">
            <div className="text-[10px] text-gray-400 max-w-sm leading-relaxed text-left">
              ⚠️ Lembre-se de memorizar as novas credenciais inseridas antes de clicar em salvar. Se esquecer, poderá restaurar limpando o localStorage do navegador.
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-brand-purple hover:bg-brand-purple-light text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alterações de Acesso</span>
            </button>
          </div>
        </form>
      )}

      {/* 📝 REGISTRATION EDITING MODAL */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-purple-150 shadow-2xl p-6 relative flex flex-col gap-4 animate-scaleUp">
            <h3 className="font-display font-black text-sm text-purple-900 border-b border-purple-50 pb-3 flex items-center gap-2">
              <User className="text-brand-purple w-4 h-4" />
              Editar Cadastro: {editingClient.name}
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const updatedClients = clientUsers.map(c => c.id === editingClient.id ? editingClient : c);
              setClientUsers(updatedClients);
              saveClientUsers(updatedClients);
              
              const cleanPhone = editingClient.phone.replace(/\D/g, "");
              const isAlreadyLoyal = loyaltyUsers.find(l => l.phone.replace(/\D/g, "") === cleanPhone || l.id === "loyalty_" + editingClient.id);
              if (isAlreadyLoyal) {
                onUpdateLoyaltyPoints(editingClient.phone, editingClient.points - (isAlreadyLoyal.points || 0));
              }
              
              setEditingClient(null);
              alert("✓ Cadastro do cliente atualizado com sucesso!");
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={editingClient.name}
                    onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-gray-900 font-medium"
                  />
                </div>
                
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-gray-900 font-mono"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Pontos de Fidelidade Acumulados</label>
                  <input
                    type="number"
                    min="0"
                    value={editingClient.points || 0}
                    onChange={e => setEditingClient({ ...editingClient, points: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-gray-900 font-black"
                  />
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div className="border-t border-purple-50 pt-3 mt-2">
                <span className="text-[10px] text-purple-900 uppercase font-black block mb-2">📍 Endereço de Entrega</span>
                <div className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-8 overflow-hidden">
                    <label className="block text-[10px] font-bold text-gray-500">Rua/Logradouro</label>
                    <input
                      type="text"
                      value={editingClient.address?.street || ""}
                      onChange={e => setEditingClient({
                        ...editingClient,
                        address: { ...(editingClient.address || { street: "", number: "", neighborhood: "" }), street: e.target.value }
                      })}
                      className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white text-gray-900"
                    />
                  </div>
                  <div className="col-span-4 overflow-hidden">
                    <label className="block text-[10px] font-bold text-gray-500">Número</label>
                    <input
                      type="text"
                      value={editingClient.address?.number || ""}
                      onChange={e => setEditingClient({
                        ...editingClient,
                        address: { ...(editingClient.address || { street: "", number: "", neighborhood: "" }), number: e.target.value }
                      })}
                      className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white text-gray-900 font-mono"
                    />
                  </div>
                  <div className="col-span-6 overflow-hidden">
                    <label className="block text-[10px] font-bold text-gray-500">Bairro</label>
                    <input
                      type="text"
                      value={editingClient.address?.neighborhood || ""}
                      onChange={e => setEditingClient({
                        ...editingClient,
                        address: { ...(editingClient.address || { street: "", number: "", neighborhood: "" }), neighborhood: e.target.value }
                      })}
                      className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white text-gray-900"
                    />
                  </div>
                  <div className="col-span-6 overflow-hidden">
                    <label className="block text-[10px] font-bold text-gray-500">Complemento / Ref</label>
                    <input
                      type="text"
                      value={editingClient.address?.complement || ""}
                      onChange={e => setEditingClient({
                        ...editingClient,
                        address: { ...(editingClient.address || { street: "", number: "", neighborhood: "" }), complement: e.target.value }
                      })}
                      className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 border rounded-xl hover:bg-gray-50 text-gray-600 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-purple hover:bg-brand-purple-light text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
