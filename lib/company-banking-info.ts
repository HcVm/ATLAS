export interface BankingInfo {
  bankAccount?: {
    bank: string
    accountNumber: string
    cci: string
    type: "CORRIENTE" | "AHORROS"
  }
  detractionAccount?: {
    accountNumber: string
  }
  fiscalAddress?: string
  contactInfo?: {
    mobile?: string
    phone?: string
    email?: string[]
  }
}

export interface CompanyBankingData {
  [companyCode: string]: BankingInfo
}

// Información bancaria, fiscal y de contacto hardcodeada por empresa
export const COMPANY_BANKING_INFO: CompanyBankingData = {
  AGLE: {
    bankAccount: {
      bank: "BCP",
      accountNumber: "191-9905265-0-80",
      cci: "002-191009905265080-53",
      type: "CORRIENTE",
    },
    detractionAccount: {
      accountNumber: "00-074-243770",
    },
    fiscalAddress: "AV. CANTA CALLAO MZA. K2 LOTE. 8 LIMA - LIMA - LOS OLIVOS",
    contactInfo: {
      mobile: "940930710",
      phone: "01-748 2242 ANEXO 112",
      email: ["cotizaciones.lg@agleperuvianc.com", "cotizaciones.eg@agleperuvianc.com"],
    },
  },
  ARM: {
    bankAccount: {
      bank: "BCP",
      accountNumber: "191-9864057-0-37",
      cci: "002-191009864057037-54",
      type: "CORRIENTE",
    },
    detractionAccount: {
      accountNumber: "00-074-243800",
    },
    fiscalAddress:
      "JR. HUANTAR NRO. 3311 URB. CA HUANTAR 5030 N3311 URB PARQUE EL NARANJAL 2DA ETAPA LIMA - LIMA - LOS OLIVOS",
    contactInfo: {
      mobile: "940959514",
      phone: "01-748 3677 ANEXO 102",
      email: ["arm-ventas@armcorporations.com", "arm1-ventas@armcorporations.com"],
    },
  },
  GALUR: {
    bankAccount: {
      bank: "BCP",
      accountNumber: "191-70831800-71",
      cci: "002-191007083180071-52",
      type: "CORRIENTE",
    },
    detractionAccount: {
      accountNumber: "00-074-278817",
    },
    fiscalAddress: "JR. ICA MZA. K LOTE. 15 FONAVI (ALT DEL OVALO DEL OBELISCO) MADRE DE DIOS - TAMBOPATA - TAMBOPATA",
    contactInfo: {
      mobile: "915166406",
      phone: "082-470 013 ANEXO 122",
      email: ["ventas.galur@galurbc.com", "ventas2.galur@galurbc.com"],
    },
  },
  AMCO: {
    bankAccount: {
      bank: "BCP",
      accountNumber: "191-95376033-0-25",
      cci: "002-191195376033025-57",
      type: "AHORROS",
    },
    // Sin cuenta de detracción
    // Sin domicilio fiscal
    contactInfo: {
      mobile: "955534639",
      // Sin central telefónica
      // Sin correo electrónico
    },
  },
  GMC: {
    bankAccount: {
      bank: "BCP",
      accountNumber: "191-95452146-0-07",
      cci: "002-191195452146007-58",
      type: "AHORROS",
    },
    // Sin cuenta de detracción
    // Sin domicilio fiscal
    contactInfo: {
      mobile: "927177714",
      // Sin central telefónica
      // Sin correo electrónico
    },
  },
}

// Función para obtener información bancaria por código de empresa
export const getBankingInfoByCompanyCode = (companyCode: string): BankingInfo | null => {
  return COMPANY_BANKING_INFO[companyCode.toUpperCase()] || null
}

// Función para obtener información bancaria por ID de empresa (requiere consulta a BD)
export const getBankingInfoByCompanyId = async (companyId: string): Promise<BankingInfo | null> => {
  // Esta función necesitaría hacer una consulta a la base de datos para obtener el código
  // Por ahora, asumimos que el código está disponible en el contexto
  return null
}

// Función para formatear información bancaria para mostrar
export const formatBankingInfo = (bankingInfo: BankingInfo): string => {
  let formatted = ""

  // Información bancaria
  if (bankingInfo.bankAccount) {
    formatted += `CUENTA ${bankingInfo.bankAccount.type} SOLES ${bankingInfo.bankAccount.bank}\n`
    formatted += `CTA: ${bankingInfo.bankAccount.accountNumber}\n`
    formatted += `CCI: ${bankingInfo.bankAccount.cci}\n\n`
  }

  // Cuenta de detracción
  if (bankingInfo.detractionAccount) {
    formatted += `CUENTA DE DETRACCIÓN\n`
    formatted += `CTA: ${bankingInfo.detractionAccount.accountNumber}\n\n`
  } else {
    formatted += `CUENTA DE DETRACCIÓN\nSIN CUENTA DE DETRACCIÓN\n\n`
  }

  // Domicilio fiscal
  if (bankingInfo.fiscalAddress) {
    formatted += `Domicilio Fiscal:\n${bankingInfo.fiscalAddress}\n\n`
  } else {
    formatted += `Domicilio Fiscal:\nSIN DOMICILIO FISCAL\n\n`
  }

  // Información de contacto
  if (bankingInfo.contactInfo) {
    // Celular
    if (bankingInfo.contactInfo.mobile) {
      formatted += `CELULAR:\n${bankingInfo.contactInfo.mobile}\n\n`
    } else {
      formatted += `CELULAR:\nSIN CELULAR\n\n`
    }

    // Central telefónica
    if (bankingInfo.contactInfo.phone) {
      formatted += `CENTRAL TELEFÓNICA:\n${bankingInfo.contactInfo.phone}\n\n`
    } else {
      formatted += `CENTRAL TELEFÓNICA:\nSIN CENTRAL TELEFÓNICA\n\n`
    }

    // Correo electrónico
    if (bankingInfo.contactInfo.email && bankingInfo.contactInfo.email.length > 0) {
      formatted += `CORREO ELECTRÓNICO:\n${bankingInfo.contactInfo.email.join(" / ")}`
    } else {
      formatted += `CORREO ELECTRÓNICO:\nSIN CORREO ELECTRÓNICO`
    }
  } else {
    // Si no hay información de contacto
    formatted += `CELULAR:\nSIN CELULAR\n\n`
    formatted += `CENTRAL TELEFÓNICA:\nSIN CENTRAL TELEFÓNICA\n\n`
    formatted += `CORREO ELECTRÓNICO:\nSIN CORREO ELECTRÓNICO`
  }

  return formatted
}

// Función para obtener solo la información de contacto formateada
export const formatContactInfo = (bankingInfo: BankingInfo): string => {
  let formatted = ""

  if (bankingInfo.contactInfo) {
    if (bankingInfo.contactInfo.mobile) {
      formatted += `Celular: ${bankingInfo.contactInfo.mobile}\n`
    }

    if (bankingInfo.contactInfo.phone) {
      formatted += `Teléfono: ${bankingInfo.contactInfo.phone}\n`
    }

    if (bankingInfo.contactInfo.email && bankingInfo.contactInfo.email.length > 0) {
      formatted += `Email: ${bankingInfo.contactInfo.email.join(", ")}`
    }
  }

  return formatted.trim()
}
