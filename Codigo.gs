// ===== TOKYO SUSHI - BACKEND COMPLETO E DEFINITIVO =====
const SPREADSHEET_ID = '1ax-bknAR_532sAoN0pDTkGar5VML_m-TO9GDvc-xCIE';
const GOOGLE_DRIVE_FOLDER_ID = '1HUV6HOm14L9qRHF_id3-NtyFxuapOoOs'; 

const SHEETS = { 
  PRODUCTS: 'Produtos', 
  ORDERS: 'Pedidos', 
  CONFIG: 'Config' 
};

function doGet(e) {
  const action = e.parameter.action;
  let result = { success: false, error: 'Ação inválida' };
  try {
    if (action === 'getProducts') result = getProducts();
    else if (action === 'getOrders') result = getOrders();
    else if (action === 'getConfig') result = getConfig();
  } catch(err) { result.error = err.toString(); }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result = { success: false, error: 'Ação POST inválida' };
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data;
    
    if (action === 'uploadImage') {
      const contentType = data.image.match(/data:([^;]+);/)[1];
      const base64Data = data.image.split(',')[1];
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, data.fileName || 'produto.jpg');
      const file = DriveApp.getFolderById(GOOGLE_DRIVE_FOLDER_ID).createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      // Link direto de visualização
      const imageUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: imageUrl })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'createProduct') result = createProduct(data);
    else if (action === 'updateProduct') result = updateProduct(data);
    else if (action === 'deleteProduct') result = deleteProduct(data);
    else if (action === 'createOrder') result = createOrder(data);
    else if (action === 'updateOrderStatus') result = updateOrderStatus(data);
    else if (action === 'saveConfig') result = saveConfig(data);
    
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function getProducts() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PRODUCTS);
  const data = sheet.getDataRange().getValues();
  const products = data.slice(1).map(r => ({
    id: String(r[0]), nome: r[1], descricao: r[2], categoria: r[3], preco: r[4], imagem: r[5], ativo: r[6], destaque: r[7]
  }));
  return { success: true, products: products };
}

function createProduct(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PRODUCTS);
  sheet.appendRow([String(data.id), data.nome, data.descricao, data.categoria, data.preco, data.imagem, data.ativo, data.destaque]);
  return { success: true };
}

function updateProduct(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PRODUCTS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 1, 1, 8).setValues([[String(data.id), data.nome, data.descricao, data.categoria, data.preco, data.imagem, data.ativo, data.destaque]]);
      break;
    }
  }
  return { success: true };
}

function deleteProduct(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PRODUCTS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

function getOrders() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  const orders = data.slice(1).map(r => ({
    id: String(r[0]), data: r[1], cliente: { nome: r[2], telefone: r[3], endereco: r[4], complemento: r[5] },
    itens: JSON.parse(r[6] || '[]'), total: r[7], pagamento: r[8], troco: r[9], observacoes: r[10], status: r[11]
  }));
  return { success: true, orders: orders };
}

function createOrder(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.ORDERS);
  const orderId = "ORD" + new Date().getTime().toString().slice(-6);
  sheet.appendRow([
    orderId, data.data, data.cliente.nome, data.cliente.telefone, data.cliente.endereco, 
    data.cliente.complemento, JSON.stringify(data.itens), data.total, data.pagamento, data.troco, data.observacoes, 'pendente'
  ]);
  return { success: true, orderId: orderId };
}

function updateOrderStatus(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.ORDERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 12).setValue(data.status);
      break;
    }
  }
  return { success: true };
}

function getConfig() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.CONFIG);
  const data = sheet.getDataRange().getValues();
  const config = {};
  data.forEach(r => { if(r[0]) config[r[0]] = r[1]; });
  return { success: true, config: config };
}

function saveConfig(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.CONFIG);
  for (const key in data) {
    let found = false;
    const rows = sheet.getDataRange().getValues();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(data[key]);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, data[key]]);
  }
  return { success: true };
}

function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss.getSheetByName(SHEETS.PRODUCTS)) ss.insertSheet(SHEETS.PRODUCTS).appendRow(['ID', 'Nome', 'Descrição', 'Categoria', 'Preço', 'Imagem', 'Ativo', 'Destaque']);
  if (!ss.getSheetByName(SHEETS.ORDERS)) ss.insertSheet(SHEETS.ORDERS).appendRow(['ID', 'Data', 'Cliente', 'Telefone', 'Endereço', 'Complemento', 'Itens', 'Total', 'Pagamento', 'Troco', 'Observações', 'Status']);
  if (!ss.getSheetByName(SHEETS.CONFIG)) ss.insertSheet(SHEETS.CONFIG).appendRow(['Chave', 'Valor']);
  DriveApp.getFolderById(GOOGLE_DRIVE_FOLDER_ID);
  Logger.log('Setup concluído!');
}
