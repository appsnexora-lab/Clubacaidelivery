import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, ShoppingBag, MapPin, CreditCard, MessageSquare, ShieldCheck } from "lucide-react";
import { CompanyInfo, CartItem } from "../types";
import { getStoredCompanyInfo } from "../data/storage";
import { formatBrazilianPhone, validateBrazilianPhone, generateWhatsAppLink } from "../utils";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo;
  customerName: string;
  customerPhone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    complement?: string;
    city: string;
    zipCode: string;
  };
  cartItems: CartItem[];
  subtotal: number;
  total: number;
  loyaltyDiscount: number;
  autoPromoDiscount: number;
  couponDiscount: number;
  appliedCoupon: any | null;
  redeemFreeAcai: boolean;
  paymentMethod: string;
  changeFor?: string;
  selectedFreeToppings?: string[];
  earnedPoints: number;
  redeemedPoints: number;
  onProceedToWhatsApp: () => void;
  isFreeDeliveryToday?: boolean;
  orderId?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  companyInfo,
  customerName,
  customerPhone,
  address,
  cartItems,
  subtotal,
  total,
  loyaltyDiscount,
  autoPromoDiscount,
  couponDiscount,
  appliedCoupon,
  redeemFreeAcai,
  paymentMethod,
  changeFor,
  selectedFreeToppings = [],
  onProceedToWhatsApp,
  isFreeDeliveryToday = false,
  orderId,
}) => {

  const [linkMode, setLinkMode] = React.useState<"auto" | "web" | "app">("auto");
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const latestCompanyInfo = getStoredCompanyInfo() || companyInfo;

  // Let's generate a beautiful formatted plain text to go into WhatsApp
  let orderText = `*NOVO PEDIDO - ${latestCompanyInfo.name.toUpperCase()}*\n\n`;

  if (orderId) {
    orderText += `*CÓDIGO DO PEDIDO*\n- ${orderId}\n\n`;
  }

  if (redeemFreeAcai) {
    orderText += `*RESGATE DE PRÊMIO FIDELIDADE*\n\n`;
  }

  orderText += `*CLIENTE*\n`;
  orderText += `- Nome: ${customerName}\n`;
  orderText += `- WhatsApp: ${customerPhone}\n\n`;

  orderText += `*ENDEREÇO DE ENTREGA*\n`;
  orderText += `- Rua: ${address.street}, Nº ${address.number}\n`;
  orderText += `- Bairro: ${address.neighborhood}\n`;
  if (address.complement) {
    orderText += `- Complemento: ${address.complement}\n`;
  }
  orderText += `- Cidade: ${address.city} (CEP: ${address.zipCode})\n\n`;

  orderText += `*FORMA DE PAGAMENTO*\n`;
  if (paymentMethod === "Dinheiro" && changeFor) {
    orderText += `- Dinheiro (Troco para R$ ${parseFloat(changeFor).toFixed(2)})\n\n`;
  } else if (paymentMethod === "Pix" && latestCompanyInfo.pixKey) {
    orderText += `- Pix (Chave Pix: ${latestCompanyInfo.pixKey})\n\n`;
  } else {
    orderText += `- ${paymentMethod}\n\n`;
  }

  if (selectedFreeToppings && selectedFreeToppings.length > 0) {
    orderText += `*BRINDES DA PROMOÇÃO*\n`;
    selectedFreeToppings.forEach((top) => {
      orderText += `- ${top}\n`;
    });
    orderText += `\n`;
  }

  orderText += `*ITENS DO PEDIDO*\n`;
  cartItems.forEach((item, idx) => {
    orderText += `${idx + 1}. ${item.quantity}x ${item.product.name} (${item.selectedSize}) - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    if (item.customizations) {
      const comps = [
        ...(item.customizations.complements || []),
        ...(item.customizations.fruits || []),
        ...(item.customizations.sauces || []),
        ...(item.customizations.additionals || []),
      ];
      if (comps.length > 0) {
        orderText += `   Opções: ${comps.join(", ")}\n`;
      }
    }
  });
  orderText += `\n`;

  orderText += `*RESUMO FINANCEIRO*\n`;
  orderText += `- Subtotal: R$ ${subtotal.toFixed(2)}\n`;
  
  if (loyaltyDiscount > 0) {
    orderText += `- Cortesia Fidelidade: -R$ ${loyaltyDiscount.toFixed(2)}\n`;
  }
  if (autoPromoDiscount > 0) {
    orderText += `- Desconto Promoção: -R$ ${autoPromoDiscount.toFixed(2)}\n`;
  }
  if (appliedCoupon) {
    orderText += `- Cupom (${appliedCoupon.code}): -R$ ${couponDiscount.toFixed(2)}\n`;
  }
  
  if (isFreeDeliveryToday) {
    orderText += `- Taxa de Entrega: Grátis (Promoção)\n`;
  } else {
    orderText += `- Taxa de Entrega: A calcular\n`;
  }
  orderText += `- *VALOR TOTAL: R$ ${total.toFixed(2)}*\n\n`;

  if (isFreeDeliveryToday) {
    orderText += `_Por favor, confirme as informações do pedido no chat para darmos início à preparação!_`;
  } else {
    orderText += `_Por favor, confirme as informações do pedido e envie sua localização para calcularmos a entrega._`;
  }

  const rawWhatsapp = latestCompanyInfo.whatsapp || "";
  const cleanPhone = formatBrazilianPhone(rawWhatsapp);
  const validation = validateBrazilianPhone(cleanPhone);
  const isConfigured = !!rawWhatsapp.trim();
  const isValid = validation.isValid;

  const encodedMessage = encodeURIComponent(orderText);
  const whatsappLink = isValid 
    ? generateWhatsAppLink(rawWhatsapp, orderText, linkMode === "auto" ? undefined : linkMode)
    : "#";

  // Auditoria solicitada pelo usuário (Logs de depuração oficiais)
  console.log("Número original:", rawWhatsapp);
  console.log("Número formatado:", cleanPhone);
  console.log("URL WhatsApp:", whatsappLink);

  // Logs adicionais detalhados
  console.log("================= WHATSAPP AUDIT LOGS =================");
  console.log("[WhatsApp Debug] Número recuperado do painel:", rawWhatsapp);
  console.log("[WhatsApp Debug] Número formatado:", cleanPhone);
  console.log(`[WhatsApp Debug] Link final gerado para o WhatsApp (linkMode: ${linkMode}):`, whatsappLink);
  console.log("[WhatsApp Debug] Status - Configurado:", isConfigured, "| Válido:", isValid);
  if (!isValid) {
    console.log("[WhatsApp Debug] Razão da falha:", validation.error);
  }
  console.log("======================================================");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 overflow-y-auto backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className={`p-5 text-white ${redeemFreeAcai ? "bg-emerald-600" : "bg-purple-900"} shrink-0 flex items-center justify-between`}>
            <div>
              <h3 className="font-sans font-black text-base md:text-lg uppercase tracking-tight flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-white animate-bounce" />
                {redeemFreeAcai ? "Resgate Gerado!" : "Pedido Confirmado!"}
              </h3>
              <p className="text-white/80 text-xs mt-0.5 font-medium">
                Quase lá! Confirme as informações e envie no WhatsApp.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formatted Order Details Container */}
          <div className="p-5 md:p-6 bg-gray-50 flex-1 overflow-y-auto space-y-5 text-xs text-gray-800 scrollbar-thin">
            {/* Delivery Alert Disclaimer */}
            <div className={`p-4 rounded-2xl flex gap-3 items-start border ${redeemFreeAcai ? "bg-emerald-50 border-emerald-150 text-emerald-950" : "bg-purple-50 border-purple-150 text-purple-950"}`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 ${redeemFreeAcai ? "text-emerald-600" : "text-purple-700"}`} />
              <div>
                <p className="font-bold text-gray-900">Enviando seu pedido por Whatsapp:</p>
                <p className="text-gray-600 leading-normal mt-0.5">
                  Clique no botão verde no final desta tela. O seu pedido será enviado automaticamente no chat. Lembre-se de mandar também sua <b>Localização em tempo real</b> para o cálculo da taxa de entrega.
                </p>
              </div>
            </div>

            {/* Visual Phone Configuration Error Alert */}
            {!isValid && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 flex flex-col gap-1.5 animate-pulse">
                <p className="font-extrabold text-xs text-red-700 uppercase tracking-wider flex items-center gap-1">⚠️ Erro de Configuração de WhatsApp</p>
                <p className="text-gray-700 leading-normal text-[11px]">
                  O número de WhatsApp da loja configurado no painel administrativo 
                  <strong> {rawWhatsapp ? `"${rawWhatsapp}"` : "(não configurado)"}</strong> é inválido.
                </p>
                <p className="text-gray-700 leading-normal text-[11px] font-medium border-t border-red-100 pt-1.5 mt-0.5">
                  <strong>Como corrigir:</strong> Acesse a aba lateral <strong>Administração</strong> &gt; aba <strong>Empresa</strong> e insira um número válido com DDD (Exemplo: <code>(81) 99999-9999</code>). O sistema tratará a formatação automaticamente!
                </p>
              </div>
            )}

            {/* Order ID display */}
            {orderId && (
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col gap-1">
                <span className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wide block">🆔 Código do Pedido</span>
                <p className="font-mono text-purple-950 text-sm font-bold bg-white p-2 rounded-lg border border-purple-150 select-all">{orderId}</p>
                <p className="text-[10px] text-purple-700">Use este código para acompanhar o seu pedido junto ao atendimento.</p>
              </div>
            )}

            {/* Client Breakdown */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-2">
              <span className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wide block">👤 Cliente</span>
              <p className="font-black text-gray-900 text-sm">{customerName}</p>
              <p className="font-medium text-gray-500 font-mono">WhatsApp: {customerPhone}</p>
            </div>

            {/* Address Breakdown */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-1.5">
              <span className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Endereço de Entrega
              </span>
              <p className="font-bold text-gray-900">{address.street}, Nº {address.number}</p>
              <p className="text-gray-600">Bairro: {address.neighborhood}</p>
              {address.complement && (
                <p className="text-gray-500 italic">Complemento/Referência: {address.complement}</p>
              )}
              <p className="text-gray-500 font-mono">Cidade: {address.city} - {address.zipCode}</p>
            </div>

            {/* Payment & Toppings Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-1">
                <span className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Pagamento
                </span>
                <p className="font-bold text-gray-900">
                  {paymentMethod}
                  {paymentMethod === "Dinheiro" && changeFor && ` (Troco para R$ ${parseFloat(changeFor).toFixed(2)})`}
                </p>
                {paymentMethod === "Pix" && latestCompanyInfo.pixKey && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Chave Pix:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(latestCompanyInfo.pixKey || "");
                          alert("Chave Pix copiada com sucesso!");
                        }}
                        className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                      >
                        Copiar Chave
                      </button>
                    </div>
                    <p className="text-[10.5px] font-mono font-black text-emerald-950 break-all select-all">
                      {latestCompanyInfo.pixKey}
                    </p>
                  </div>
                )}
              </div>

              {selectedFreeToppings && selectedFreeToppings.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-1">
                  <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wide">🎁 Brindes Diários</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFreeToppings.map((top, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-2 py-0.5 rounded text-[10px]">
                        + {top}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Products Breakdown */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-3">
              <span className="text-[10px] text-purple-900 font-extrabold uppercase tracking-wide block border-b border-gray-100 pb-1.5">🛒 Itens no Pedido</span>
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-bold text-gray-900">{item.quantity}x {item.product.name} ({item.selectedSize})</p>
                      {item.customizations && (
                        <p className="text-gray-500 text-[10px] italic mt-0.5 leading-normal">
                          {[
                            ...(item.customizations.complements || []),
                            ...(item.customizations.fruits || []),
                            ...(item.customizations.sauces || []),
                            ...(item.customizations.additionals || []),
                          ].join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-gray-900 shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary panel */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Prêmio Fidelidade:</span>
                  <span>- R$ {loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              {autoPromoDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Desconto de Promoção:</span>
                  <span>- R$ {autoPromoDiscount.toFixed(2)}</span>
                </div>
              )}
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Cupom ({appliedCoupon.code}):</span>
                  <span>- R$ {couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Taxa de Entrega:</span>
                {isFreeDeliveryToday ? (
                  <span className="text-emerald-700 font-bold">Grátis (Promoção do Dia)</span>
                ) : (
                  <span className="italic">A calcular no WhatsApp</span>
                )}
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 font-black text-gray-900 text-sm">
                <span>VALOR TOTAL:</span>
                <span className="text-purple-900">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Sticky checkout button */}
          <div className="p-4 md:p-5 bg-white border-t border-gray-100 shrink-0 space-y-3">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!isValid) {
                  e.preventDefault();
                  if (!isConfigured) {
                    alert("WhatsApp da loja não configurado.");
                  } else {
                    alert(`Não foi possível enviar o pedido. O WhatsApp configurado no painel administrativo (${rawWhatsapp}) é inválido ou incompleto (deve possuir DDD + número).`);
                  }
                  return;
                }
                onProceedToWhatsApp();
              }}
              className="w-full py-4 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50"
            >
              <MessageSquare className="w-5 h-5 text-white animate-pulse" />
              <span>Finalizar e Enviar via WhatsApp</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </a>

            {/* Alternativas anti-bloqueio / WhatsApp Business fallback removed by user request */}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
