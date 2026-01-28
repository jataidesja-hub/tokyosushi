// ===== TOKYO SUSHI - GOOGLE APPS SCRIPT =====
// Cole este código no Google Apps Script (script.google.com)

// ID da planilha
const SPREADSHEET_ID = '1ax-bknAR_532sAoN0pDTkGar5VML_m-TO9GDvc-xCIE';

// ID da pasta do Drive para imagens (será criada automaticamente)
let IMAGES_FOLDER_ID = '';

// Nomes das abas
const SHEETS = {
  PRODUCTS: 'Produtos',
  ORDERS: 'Pedidos',
  CONFIG: 'Config'
};

// Função para processar requisições GET
function doGet(e) {
  const action = e.parameter.action;
  let result;
  
  try {
    switch(action) {
      case 'getProducts':
        result = getProducts();
        break;
      case 'getOrders':
        result = getOrders();
        break;
      case 'getConfig':
        result = getConfig();
        break;
      default:
        result = { success: false, error: 'Ação inválida' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função para processar requisições POST
function doPost(e) {
  let result;
  
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data;
    
    switch(action) {
      case 'createProduct':
        result = createProduct(data);
        break;
      case 'updateProduct':
        result = updateProduct(data);
        break;
      case 'deleteProduct':
        result = deleteProduct(data);
        break;
      case 'createOrder':
        result = createOrder(data);
        break;
      case 'updateOrderStatus':
        result = updateOrderStatus(data);
        break;
      case 'saveConfig':
        result = saveConfig(data);
        break;
      case 'uploadImage':
        result = uploadImage(data);
        break;
      default:
        result = { success: false, error: 'Ação inválida' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== SETUP =====
function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Criar aba Produtos
  let productsSheet = ss.getSheetByName(SHEETS.PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEETS.PRODUCTS);
    productsSheet.appendRow(['ID', 'Nome', 'Descrição', 'Categoria', 'Preço', 'Imagem', 'Ativo', 'Destaque']);
  }
  
  // Criar aba Pedidos
  let ordersSheet = ss.getSheetByName(SHEETS.ORDERS);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(SHEETS.ORDERS);
    ordersSheet.appendRow(['ID', 'Data', 'Cliente', 'Telefone', 'Endereço', 'Complemento', 'Itens', 'Total', 'Pagamento', 'Troco', 'Observações', 'Status']);
  }
  
  // Criar aba Config
  let configSheet = ss.getSheetByName(SHEETS.CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEETS.CONFIG);
    configSheet.appendRow(['Chave', 'Valor']);
    configSheet.appendRow(['storeName', 'Tokyo Sushi']);
    configSheet.appendRow(['whatsapp', '']);
    configSheet.appendRow(['pixKey', '']);
    configSheet.appendRow(['address', '']);
    configSheet.appendRow(['imagesFolderId', '']);
  }
  
  // Criar pasta de imagens no Drive
  createImagesFolder();
  
  Logger.log('Setup concluído!');
}

// Criar pasta para imagens no Drive
function createImagesFolder() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEETS.CONFIG);
    const data = configSheet.getDataRange().getValues();
    
    // Verificar se já existe pasta configurada
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'imagesFolderId' && data[i][1]) {
        IMAGES_FOLDER_ID = data[i][1];
        return;
      }
    }
    
    // Criar nova pasta
    const folder = DriveApp.createFolder('Tokyo Sushi - Imagens');
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    IMAGES_FOLDER_ID = folder.getId();
    
    // Salvar ID da pasta
    configSheet.appendRow(['imagesFolderId', IMAGES_FOLDER_ID]);
    
    Logger.log('Pasta de imagens criada: ' + IMAGES_FOLDER_ID);
  } catch(error) {
    Logger.log('Erro ao criar pasta: ' + error.toString());
  }
}

// Upload de imagem para o Drive
function uploadImage(data) {
  try {
    // Obter pasta de imagens
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName(SHEETS.CONFIG);
    const configData = configSheet.getDataRange().getValues();
    
    let folderId = '';
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === 'imagesFolderId') {
        folderId = configData[i][1];
        break;
      }
    }
    
    if (!folderId) {
      createImagesFolder();
      folderId = IMAGES_FOLDER_ID;
    }
    
    // Decodificar base64
    const base64Data = data.image.split(',')[1];
    const mimeType = data.image.match(/data:([^;]+);/)[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, data.fileName);
    
    // Salvar no Drive
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Retornar URL da imagem
    const imageUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    
    return { success: true, imageUrl: imageUrl };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ===== PRODUTOS =====
function getProducts() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
    const data = sheet.getDataRange().getValues();
    
    const products = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        products.push({
          id: row[0].toString(),
          nome: row[1],
          descricao: row[2],
          categoria: row[3],
          preco: parseFloat(row[4]) || 0,
          imagem: row[5],
          ativo: row[6] === true || row[6] === 'true' || row[6] === 'TRUE',
          destaque: row[7] === true || row[7] === 'true' || row[7] === 'TRUE'
        });
      }
    }
    
    return { success: true, products };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function createProduct(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
    
    sheet.appendRow([
      data.id || Date.now().toString(),
      data.nome,
      data.descricao,
      data.categoria,
      data.preco,
      data.imagem,
      data.ativo,
      data.destaque
    ]);
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function updateProduct(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0].toString() === data.id.toString()) {
        sheet.getRange(i + 1, 2).setValue(data.nome);
        sheet.getRange(i + 1, 3).setValue(data.descricao);
        sheet.getRange(i + 1, 4).setValue(data.categoria);
        sheet.getRange(i + 1, 5).setValue(data.preco);
        sheet.getRange(i + 1, 6).setValue(data.imagem);
        sheet.getRange(i + 1, 7).setValue(data.ativo);
        sheet.getRange(i + 1, 8).setValue(data.destaque);
        break;
      }
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function deleteProduct(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0].toString() === data.id.toString()) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

// ===== PEDIDOS =====
function getOrders() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ORDERS);
    const data = sheet.getDataRange().getValues();
    
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        let itens = [];
        try {
          itens = JSON.parse(row[6]);
        } catch(e) {}
        
        orders.push({
          id: row[0].toString(),
          data: row[1],
          cliente: {
            nome: row[2],
            telefone: row[3],
            endereco: row[4],
            complemento: row[5]
          },
          itens: itens,
          total: parseFloat(row[7]) || 0,
          pagamento: row[8],
          troco: row[9],
          observacoes: row[10],
          status: row[11] || 'pendente'
        });
      }
    }
    
    orders.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    return { success: true, orders };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function createOrder(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ORDERS);
    
    const orderId = generateOrderId();
    
    sheet.appendRow([
      orderId,
      data.data || new Date().toISOString(),
      data.cliente?.nome || '',
      data.cliente?.telefone || '',
      data.cliente?.endereco || '',
      data.cliente?.complemento || '',
      JSON.stringify(data.itens || []),
      data.total || 0,
      data.pagamento || '',
      data.troco || '',
      data.observacoes || '',
      'pendente'
    ]);
    
    return { success: true, orderId };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function updateOrderStatus(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ORDERS);
    const allData = sheet.getDataRange().getValues();
    
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0].toString() === data.id.toString()) {
        sheet.getRange(i + 1, 12).setValue(data.status);
        break;
      }
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function generateOrderId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return year + month + day + random;
}

// ===== CONFIG =====
function getConfig() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CONFIG);
    const data = sheet.getDataRange().getValues();
    
    const config = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        config[data[i][0]] = data[i][1];
      }
    }
    
    return { success: true, config };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function saveConfig(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CONFIG);
    const allData = sheet.getDataRange().getValues();
    
    for (const key in data) {
      let found = false;
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(data[key]);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, data[key]]);
      }
    }
    
    return { success: true };
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}
