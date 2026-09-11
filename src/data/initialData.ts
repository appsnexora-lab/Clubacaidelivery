import { Product, VitrineItem, SocialProof, PromoWeekDay, CompanyInfo } from "../types";

export const INITIAL_COMPANY_INFO: CompanyInfo = {
  name: "Açaí Delivery",
  logo: "https://res.cloudinary.com/f2xid9nb/image/upload/v1782993101/ut3ufnwbffck1wctgqfl.jpg",
  address: "Rua Abel Queiroz Silveira, 40 - Porta Florada, Gravatá - PE",
  hours: "Todos os dias: 10h às 00h",
  whatsapp: "5581991812000",
  instagram: "__acaidelivery2025",
  mapsLink: "https://maps.google.com/?q=Rua+Abel+Queiroz+Silveira,+40+-+Porta+Florada,+Gravat%C3%A1+-+PE",
  bannerImage: "https://res.cloudinary.com/f2xid9nb/image/upload/v1783007737/ygowaf8mvlbbztwvqojd.jpg",
  isOpen: false,
  loyaltyPointsTarget: 100,
  pixKey: "goncalveseduarda120@gmail.com",
  announcement: {
    active: false,
    title: "",
    message: "",
    badge: "",
    isClosedNotice: false,
  },
  weeklyHours: {
    seg: { isOpen: true, start: "10:00", end: "00:00" },
    ter: { isOpen: true, start: "10:00", end: "00:00" },
    qua: { isOpen: true, start: "10:00", end: "00:00" },
    qui: { isOpen: true, start: "10:00", end: "00:00" },
    sex: { isOpen: true, start: "10:00", end: "00:00" },
    sab: { isOpen: true, start: "10:00", end: "00:00" },
    dom: { isOpen: true, start: "10:00", end: "00:00" },
  }
};

export const INITIAL_VITRINE: VitrineItem[] = [
  {
    id: "v1",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1000&q=80",
    title: "O Verdadeiro Creme de Pistache",
    description: "Sua taça favorita agora com o verdadeiro e cremoso creme de pistache artesanal.",
  },
  {
    id: "v2",
    image: "https://images.unsplash.com/photo-1579613832125-5d34a13ffe2a?auto=format&fit=crop&w=1000&q=80",
    title: "Morango & Nutella Premium",
    description: "Morangos frescos selecionados e generosa cobertura de Nutella original.",
  },
  {
    id: "v3",
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=1000&q=80",
    title: "Açaí Turbinado com Whey",
    description: "A energia que seu treino precisa com o melhor açaí e proteína de alta qualidade.",
  },
  {
    id: "v4",
    image: "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?auto=format&fit=crop&w=1000&q=80",
    title: "Mix de Frutas Tropicais",
    description: "Refrescante, leve e com as frutas mais frescas da estação.",
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // --- TRADICIONAIS ---
  {
    id: "p1",
    name: "Açaí Tradicional",
    description: "Açaí puro e super cremoso batido na hora, do jeito clássico que você ama.",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579613832125-5d34a13ffe2a?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?auto=format&fit=crop&w=800&q=80"
    ],
    category: "tradicionais",
    sizes: [
      { size: "330ml", price: 14.00 },
      { size: "500ml", price: 17.00 },
    ],
  },
  {
    id: "p2",
    name: "Açaí Kids",
    description: "A alegria da garotada! Copo divertido de açaí cremoso bem geladinho decorado com confeitos coloridos, jujuba e leite condensado.",
    image: "https://images.unsplash.com/photo-1579613832125-5d34a13ffe2a?auto=format&fit=crop&w=800&q=80",
    category: "tradicionais",
    sizes: [
      { size: "330ml", price: 13.00 },
      { size: "500ml", price: 16.00 },
    ],
  },
  {
    id: "p3",
    name: "Açaí Tropical",
    description: "Leve e delicioso! Nosso açaí servido com fatias frescas de banana fatiada, morango selecionado e refrescante kiwi.",
    image: "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?auto=format&fit=crop&w=800&q=80",
    category: "tradicionais",
    sizes: [
      { size: "330ml", price: 15.00 },
      { size: "500ml", price: 18.00 },
    ],
  },

  // --- GOURMETS ---
  {
    id: "p4",
    name: "Açaí Trufado",
    description: "Açaí gourmet mesclado com a nossa maravilhosa e aveludada calda de trufa de chocolate belga artesanal.",
    image: "https://images.unsplash.com/photo-1518843025960-d60217f226f5?auto=format&fit=crop&w=800&q=80",
    category: "gourmets",
    sizes: [
      { size: "330ml", price: 18.00 },
      { size: "500ml", price: 22.00 },
    ],
  },
  {
    id: "p5",
    name: "Açaí Tentação",
    description: "Irresistível combinação de açaí cremoso com morangos frescos fatiados, leite condensado e creme trufado de chocolate especial.",
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80",
    category: "gourmets",
    sizes: [
      { size: "330ml", price: 19.00 },
      { size: "500ml", price: 23.00 },
    ],
  },
  {
    id: "p6",
    name: "Açaí Ninhotella",
    description: "Muito leite Ninho original em pó intercalado com deliciosas camadas fartas de creme de avelã Nutella original.",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518843025960-d60217f226f5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80"
    ],
    category: "gourmets",
    sizes: [
      { size: "330ml", price: 20.00 },
      { size: "500ml", price: 24.00 },
    ],
  },
  {
    id: "p7",
    name: "Açaí Trufado Ferrero Rocher",
    description: "A mais nobre experiência: açaí premium trufado coroado com bombom Ferrero Rocher inteiro, creme avelã e avelãs picadinhas.",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
    category: "gourmets",
    sizes: [
      { size: "330ml", price: 22.00 },
      { size: "500ml", price: 28.00 },
    ],
  },
  {
    id: "p8",
    name: "Açaí Duplo Ninho",
    description: "Para os fissurados em leite em pó: generoso creme de leite ninho artesanal super cremoso alternado com camadas de leite ninho.",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
    category: "gourmets",
    sizes: [
      { size: "330ml", price: 20.00 },
      { size: "500ml", price: 24.00 },
    ],
  },

  // --- COMBOS ---
  {
    id: "p9",
    name: "Combos Tradicional",
    description: "2 Açaís Tradicionais de 300ml cada um.",
    image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80",
    category: "combos",
    sizes: [
      { size: "300ml", price: 23.99, originalPrice: 28.00 },
    ],
  },
  {
    id: "p10",
    name: "Combos Kids",
    description: "2 Açaís Kids de 300ml cada.",
    image: "https://images.unsplash.com/photo-1579613832125-5d34a13ffe2a?auto=format&fit=crop&w=800&q=80",
    category: "combos",
    sizes: [
      { size: "300ml", price: 21.99, originalPrice: 26.00 },
    ],
  },
  {
    id: "p11",
    name: "Combos Tropical",
    description: "2 deliciosos Açaís Tropicais frescos de 300ml.",
    image: "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?auto=format&fit=crop&w=800&q=80",
    category: "combos",
    sizes: [
      { size: "300ml", price: 24.99, originalPrice: 30.00 },
    ],
  },
  {
    id: "p12",
    name: "Combo 1 Litro",
    description: "2 copos de Açaí Tradicional de 500ml cada para a máxima energia.",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
    category: "combos",
    sizes: [
      { size: "500ml", price: 30.99, originalPrice: 35.00 },
    ],
  },
  {
    id: "p13",
    name: "Combo Açaí Trufado",
    description: "Combo Especial! 2 Açaís Trufados Premium de 330ml cada com nossa maravilhosa calda de trufa belga artesanal.",
    image: "https://images.unsplash.com/photo-1518843025960-d60217f226f5?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1518843025960-d60217f226f5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80"
    ],
    category: "combos",
    sizes: [
      { size: "2x 330ml", price: 31.90, originalPrice: 36.00 },
    ],
  }
];

export const INITIAL_SOCIAL_PROOFS: SocialProof[] = [
  {
    id: "sp-init-1",
    name: "Gabriela Ramos",
    instagram: "gabi_ramos",
    rating: 5,
    comment: "Gente, o de morango com Nutella daqui é imbatível! Entrega super rápida e chega estupidamente congelado. Amei!",
    storyImage: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "sp-init-2",
    name: "Lucas Andrade",
    instagram: "lucas_and_f",
    rating: 5,
    comment: "Dia de açaí com a criançada! Copo Kids super caprichado e confeitos separados. Parabéns pelo carinho na embalagem!",
    storyImage: "https://images.unsplash.com/photo-1579613832125-5d34a13ffe2a?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "sp-init-3",
    name: "Mariana Souza",
    instagram: "mari_souza99",
    rating: 5,
    comment: "E essa combinação tropical divina? Muito refrescante e com frutas super fresquinhas. Meu pedido sagrado de todo fim de tarde!",
    storyImage: "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?auto=format&fit=crop&w=800&q=80"
  }
];

export const INITIAL_PROMOS: PromoWeekDay[] = [
  {
    id: "seg",
    dayOfWeek: "seg",
    dayName: "Segunda-feira",
    title: "10% OFF em Todo o Cardápio (exceto Combos)",
    description: "Tenha 10% off de desconto automático em todo açaí do cardápio hoje (não se aplica a combos)! Todos os produtos elegíveis receberão desconto automático no carrinho!",
    badge: "10% OFF",
    active: true,
    mondayDiscountPercent: 10
  },
  {
    id: "ter",
    dayOfWeek: "ter",
    dayName: "Terça-feira",
    title: "Toppings Extra Grátis!",
    description: "Monte seu açaí e ganhe toppings extras gratuitos especiais hoje!",
    badge: "TOPPINGS GRÁTIS",
    active: true,
    tuesdayToppings: [
      "Leite em Pó",
      "Leite Condensado",
      "M&M",
      "Granola",
      "Farinha de Amendoim",
      "Amendoim",
      "Amendoim triturado",
      "Calda de Morango",
      "Calda de Chocolate"
    ]
  },
  {
    id: "qua",
    dayOfWeek: "qua",
    dayName: "Quarta-feira",
    title: "Frete Grátis para Todo Lado",
    description: "Peça seu açaí preferido hoje e não pague nada pela taxa de entrega!",
    badge: "FRETE GRÁTIS",
    active: true,
    wednesdayLimitTime: "18:00"
  },
  {
    id: "qui",
    dayOfWeek: "qui",
    dayName: "Quinta-feira",
    title: "Açaí em Dobro (Compre 500ml, Ganhe 330ml)",
    description: "Hoje na compra de 1 Açaí Tradicional de 500ml você ganha inteiramente grátis outro Açaí Tradicional de 330ml!",
    badge: "DOBRO",
    active: true,
    thursdayBuySize: "500ml",
    thursdayGetSize: "330ml"
  },
  {
    id: "sex",
    dayOfWeek: "sex",
    dayName: "Sexta-feira",
    title: "Combo Especial de Sexta-feira",
    description: "Aproveite um combo exclusivo do cardápio com um preço super reduzido especial para abrir o seu fim de semana!",
    badge: "COMBO SEXTA",
    active: true,
    fridaySelectedProductId: "p13",
    fridaySpecialPrice: 31.90
  },
  {
    id: "sab",
    dayOfWeek: "sab",
    dayName: "Sábado",
    title: "Sábado Supremo",
    description: "Açaíteria aberta a todo vapor! Monte do seu jeito com entrega rápida e congelada.",
    badge: "SUPREMO",
    active: false
  },
  {
    id: "dom",
    dayOfWeek: "dom",
    dayName: "Domingo",
    title: "Domingão no Sofá",
    description: "O melhor açaí para acompanhar seu domingo em família. Faça seu pedido!",
    badge: "DOMINGO",
    active: false
  }
];

export const QUALITY_TILES = [
  {
    title: "Açaí Selecionado",
    description: "Produzido com açaí de alta qualidade, garantindo sabor intenso, cremosidade e frescor em cada pedido.",
    icon: "Heart", // Will resolve dynamically to Lucide icon
  },
  {
    title: "Entrega Rápida",
    description: "Seu pedido preparado na hora e entregue com agilidade para chegar perfeito até você.",
    icon: "Truck",
  },
  {
    title: "Qualidade Garantida",
    description: "Ingredientes selecionados, atendimento dedicado e o compromisso de levar qualidade, sabor e cuidado em cada entrega.",
    icon: "Star",
  },
  {
    title: "Ingredientes Frescos",
    description: "Frutas, cremes e complementos cuidadosamente escolhidos para proporcionar a melhor experiência.",
    icon: "Sparkles",
  },
];
