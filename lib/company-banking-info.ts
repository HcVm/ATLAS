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
}

export interface CompanyBankingData {
  [companyCode: string]: BankingInfo
}

// Información bancaria y fiscal hardcodeada por empresa
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

  if (bankingInfo.bankAccount) {
    formatted += `CUENTA ${bankingInfo.bankAccount.type} SOLES ${bankingInfo.bankAccount.bank}\n`
    formatted += `CTA: ${bankingInfo.bankAccount.accountNumber}\n`
    formatted += `CCI: ${bankingInfo.bankAccount.cci}\n\n`
  }

  if (bankingInfo.detractionAccount) {
    formatted += `CUENTA DE DETRACCIÓN\n`
    formatted += `CTA: ${bankingInfo.detractionAccount.accountNumber}\n\n`
  } else {
    formatted += `CUENTA DE DETRACCIÓN\nSIN CUENTA DE DETRACCIÓN\n\n`
  }

  if (bankingInfo.fiscalAddress) {
    formatted += `Domicilio Fiscal:\n${bankingInfo.fiscalAddress}`
  } else {
    formatted += `Domicilio Fiscal:\nSIN DOMICILIO FISCAL`
  }

  return formatted
}
