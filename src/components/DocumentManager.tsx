import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { 
  FileText, 
  FileSignature, 
  Upload, 
  Download, 
  FileCheck, 
  User, 
  Users,
  Search,
  X,
  Plus,
  Building, 
  Sparkles, 
  HelpCircle, 
  Settings, 
  AlertCircle, 
  ChevronRight, 
  Briefcase, 
  Calendar,
  CheckCircle2, 
  Printer, 
  FileEdit,
  ArrowRight
} from 'lucide-react';
import { useHeader } from '../context/HeaderContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import { Client, Process, Property, Bank, Broker } from '../types';

type SelectedTemplate = 'contrato_compra_venda' | 'solicitacao_credito' | 'aprovacao_credito_comercial';

export default function DocumentManager() {
  const { setTitle } = useHeader();
  const { showToast } = useToast();

  // Data states loaded from app
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Selector states
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClient2Id, setSelectedClient2Id] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate>('contrato_compra_venda');

  // Search parameters for autocomplete
  const [client1SearchQuery, setClient1SearchQuery] = useState<string>('');
  const [showClient1Dropdown, setShowClient1Dropdown] = useState<boolean>(false);
  const [client2SearchQuery, setClient2SearchQuery] = useState<string>('');
  const [showClient2Dropdown, setShowClient2Dropdown] = useState<boolean>(false);

  // Custom docx state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const docxInputRef = useRef<HTMLInputElement>(null);

  // Editable fields for templates
  const [formFields, setFormFields] = useState({
    vendedorNome: 'Solutz Empreendimentos Imobiliários Ltda',
    vendedorCNPJ: '42.987.654/0001-32',
    vendedorEndereco: 'Av. Paulista, 1000 - São Paulo/SP',
    compradorNome: '',
    compradorEmail: '',
    compradorPhone: '',
    compradorCPF: '',
    compradorEstadoCivil: 'Solteiro',
    compradorNascimento: '',
    compradorRenda: '0',
    compradorFGTS: 'Não',
    imovelEndereco: '',
    imovelMatricula: '',
    imovelValor: '0',
    imovelTipo: 'Apartamento',
    bancoNome: '',
    bancoFinanciamentoTipo: 'SBPE',
    valorFinanciado: '0',
    clausulaPenal: '10% (dez por cento) sobre o valor total da transação em caso de descumprimento de qualquer das partes.',
    dataContrato: new Date().toLocaleDateString('pt-BR'),
    testemunha1: '',
    testemunha2: '',
  });

  // Load all necessary info on mount
  useEffect(() => {
    setTitle('Formulários');

    const loadAll = async () => {
      try {
        setLoadingData(true);
        const [cls, prs, pts, bks, brks] = await Promise.all([
          api.list('clients'),
          api.list('processes'),
          api.list('properties'),
          api.list('banks'),
          api.list('brokers')
        ]);
        setClients((cls || []) as Client[]);
        setProcesses((prs || []) as Process[]);
        setProperties((pts || []) as Property[]);
        setBanks((bks || []) as Bank[]);
        setBrokers((brks || []) as Broker[]);
      } catch (err) {
        console.error('Erro ao recolher dados no Gerador de Documentos:', err);
        showToast({
          type: 'error',
          title: 'Erro de Carregamento',
          description: 'Houve um erro ao recuperar dados dos processos e clientes.',
        });
      } finally {
        setLoadingData(false);
      }
    };
    loadAll();
  }, [setTitle, showToast]);

  // Sync search inputs with selections
  useEffect(() => {
    if (selectedClientId) {
      const c = clients.find(cl => cl.id === selectedClientId);
      if (c && client1SearchQuery !== c.name) {
        setClient1SearchQuery(c.name);
      }
    } else {
      setClient1SearchQuery('');
    }
  }, [selectedClientId, clients]);

  useEffect(() => {
    if (selectedClient2Id) {
      const c = clients.find(cl => cl.id === selectedClient2Id);
      if (c && client2SearchQuery !== c.name) {
        setClient2SearchQuery(c.name);
      }
    } else {
      setClient2SearchQuery('');
    }
  }, [selectedClient2Id, clients]);

  // Sync edit fields whenever selectors change
  useEffect(() => {
    const client1 = clients.find(c => c.id === selectedClientId);
    const client2 = clients.find(c => c.id === selectedClient2Id);

    if (client1) {
      // Find matching process automatically for Client 1 to load property and contract financial values
      const automaticProcess = processes.find(p => p.clientId === selectedClientId);
      let matchedProperty = automaticProcess ? properties.find(prop => prop.id === automaticProcess.propertyId) : undefined;
      let matchedBank = automaticProcess ? banks.find(b => b.id === automaticProcess.bankId) : undefined;

      setFormFields(prev => {
        // Build comprador values considering client2 if present
        const compradorNomeCombined = client2 ? `${client1.name} e ${client2.name}` : client1.name;
        const compradorCPFCombined = client2 ? `${client1.cpf || ''} e ${client2.cpf || ''}` : (client1.cpf || '');
        const compradorEmailCombined = client2 ? `${client1.email || ''}; ${client2.email || ''}` : (client1.email || '');
        const compradorPhoneCombined = client2 ? `${client1.phone || ''} / ${client2.phone || ''}` : (client1.phone || '');
        const compradorEstadoCivilCombined = client1.maritalStatus || 'Solteiro';
        const compradorNascimentoCombined = client2 
          ? `${client1.birthDate ? new Date(client1.birthDate).toLocaleDateString('pt-BR') : ''} e ${client2.birthDate ? new Date(client2.birthDate).toLocaleDateString('pt-BR') : ''}`
          : (client1.birthDate ? new Date(client1.birthDate).toLocaleDateString('pt-BR') : '');

        const totalRendaVal = (client1.income || 0) + (client2 ? (client2.income || 0) : 0);
        const compradorRendaCombined = totalRendaVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const compradorFGTSCombined = (client1.hasFGTS || (client2 && client2.hasFGTS)) ? 'Sim' : 'Não';

        return {
          ...prev,
          compradorNome: compradorNomeCombined,
          compradorEmail: compradorEmailCombined,
          compradorPhone: compradorPhoneCombined,
          compradorCPF: compradorCPFCombined,
          compradorEstadoCivil: compradorEstadoCivilCombined,
          compradorNascimento: compradorNascimentoCombined,
          compradorRenda: compradorRendaCombined,
          compradorFGTS: compradorFGTSCombined,
          // Set automatic process details
          imovelValor: automaticProcess?.purchaseValue ? automaticProcess.purchaseValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : prev.imovelValor,
          imovelEndereco: matchedProperty ? `${matchedProperty.address}, ${matchedProperty.number || ''} ${matchedProperty.complement || ''} - ${matchedProperty.neighborhood || ''} - ${matchedProperty.city}/${matchedProperty.state}` : prev.imovelEndereco,
          imovelMatricula: matchedProperty?.registrationNumber || prev.imovelMatricula,
          imovelTipo: matchedProperty?.type || prev.imovelTipo,
          bancoNome: matchedBank?.name || prev.bancoNome,
          bancoFinanciamentoTipo: automaticProcess?.financingType || prev.bancoFinanciamentoTipo,
          valorFinanciado: automaticProcess?.financingValue ? automaticProcess.financingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : prev.valorFinanciado,
        };
      });
    }
  }, [selectedClientId, selectedClient2Id, clients, processes, properties, banks]);

  // Handles drag & drop for Word documents (.docx)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.docx')) {
        setCustomFile(file);
        showToast({
          type: 'success',
          title: 'Modelo Word Carregado!',
          description: `Arquivo "${file.name}" está pronto para preenchimento.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Formato inválido',
          description: 'Apenas arquivos do Word no formato .docx são aceitos.',
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.docx')) {
        setCustomFile(file);
        showToast({
          type: 'success',
          title: 'Modelo Word Carregado!',
          description: `Arquivo "${file.name}" pronto para preenchimento.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Formato inválido',
          description: 'Por favor, selecione um arquivo válido do Word (.docx).',
        });
      }
    }
  };

  // Preenche o arquivo Docx enviado usando pizzip + docxtemplater de VERDADE
  const handleGenerateFilledDocx = () => {
    if (!customFile) {
      showToast({
        type: 'warning',
        title: 'Nenhum arquivo enviado',
        description: 'Faça o upload de um modelo Word (.docx) primeiro.',
      });
      return;
    }

    if (!selectedClientId) {
      showToast({
        type: 'warning',
        title: 'Cliente Não Selecionado',
        description: 'Selecione um cliente para vincular os dados correspondentes.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (!content) return;

      try {
        const zip = new PizZip(content as ArrayBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        });

        // Map real data keys inside the doc template
        const dataToRender = {
          vendedor: formFields.vendedorNome,
          vendedor_cnpj: formFields.vendedorCNPJ,
          vendedor_endereco: formFields.vendedorEndereco,
          nome: formFields.compradorNome,
          cpf: formFields.compradorCPF,
          email: formFields.compradorEmail,
          telefone: formFields.compradorPhone,
          estado_civil: formFields.compradorEstadoCivil,
          nascimento: formFields.compradorNascimento,
          renda: formFields.compradorRenda,
          fgts: formFields.compradorFGTS,
          imovel_endereco: formFields.imovelEndereco,
          imovel_matricula: formFields.imovelMatricula,
          imovel_valor: formFields.imovelValor,
          imovel_tipo: formFields.imovelTipo,
          banco: formFields.bancoNome,
          modalidade: formFields.bancoFinanciamentoTipo,
          valor_financiado: formFields.valorFinanciado,
          clausula_penal: formFields.clausulaPenal,
          data: formFields.dataContrato,
          testemunha_1: formFields.testemunha1 || 'Testemunha 1',
          testemunha_2: formFields.testemunha2 || 'Testemunha 2',
          data_hoje: new Date().toLocaleDateString('pt-BR'),
        };

        doc.render(dataToRender);

        const out = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const url = URL.createObjectURL(out);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedClientName = formFields.compradorNome.toLowerCase().replace(/\s+/g, '_');
        a.download = `contrato_${sanitizedClientName}_${Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast({
          type: 'success',
          title: 'Processado com Sucesso! 🚀',
          description: 'Seu arquivo Word foi preenchido de forma nativa e baixado automaticamente.',
        });
      } catch (err) {
        console.error('Erro ao renderizar arquivo com docxtemplater:', err);
        showToast({
          type: 'error',
          title: 'Erro de Renderização',
          description: 'Houve uma falha ao ler seu template. Verifique se as marcações estão no formato {{tag}}.',
        });
      }
    };
    reader.readAsArrayBuffer(customFile);
  };

  // Gera o PDF de Alta Qualidade e visual profissional do sistema usando jsPDF
  const handleGeneratePDF = () => {
    if (!selectedClientId) {
      showToast({
        type: 'warning',
        title: 'Cliente Requerido',
        description: 'Selecione um cliente para gerar o documento oficial.',
      });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Styling Helpers and branding Colors
      const primaryColor = [26, 26, 26]; // Charcoal / Black
      const secondaryColor = [120, 120, 120]; // Gray
      const accentColor = [212, 175, 55]; // Gold accent

      // Margin controls (A4 is 210mm x 297mm)
      const marginLeft = 20;
      let currentY = 25;

      const printHeader = (docTitle: string) => {
        // Logo / Branding Block
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, 15, 180, 2, 'F'); // Dark bar on top

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('SOLUTZ', marginLeft, 32);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('INTELIGÊNCIA IMOBILIÁRIA E INTERMEDIAÇÃO DE CRÉDITO', marginLeft, 37);

        // Right side stamp metadata
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('DOCUMENTO OFICIAL', 150, 31);
        doc.setFont('helvetica', 'normal');
        doc.text(`Dt: ${formFields.dataContrato}`, 150, 35);
        doc.text(`Ref: #${selectedClientId.substring(0, 8).toUpperCase()}`, 150, 39);

        // Separation lines
        doc.setDrawColor(230, 230, 230);
        doc.line(15, 43, 195, 43);

        // Document Title Center
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        const titleWidth = doc.getTextWidth(docTitle.toUpperCase());
        const centerX = (210 - titleWidth) / 2;
        doc.text(docTitle.toUpperCase(), centerX, 52);

        currentY = 62;
      };

      const checkPageBreak = (spaceNeeded: number) => {
        if (currentY + spaceNeeded > 275) {
          doc.addPage();
          // Print dynamic minimal header for pages 2+
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Solutz Documentos Oficiais - Contrato de Cliente #${selectedClientId.substring(0, 8).toUpperCase()}`, marginLeft, 15);
          doc.line(15, 17, 195, 17);
          currentY = 25;
        }
      };

      if (selectedTemplate === 'contrato_compra_venda') {
        printHeader('CONTRATO DE PROMESSA DE COMPRA E VENDA');

        // Section I: DAS PARTES
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('1. AS PARTES', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        
        const textVendedor = `PROMITENTE VENDEDOR: ${formFields.vendedorNome}, pessoa jurídica inscrita no CNPJ sob o nº ${formFields.vendedorCNPJ}, localizada administrativamente em: ${formFields.vendedorEndereco}.`;
        const textComprador = `PROMITENTE COMPRADOR: ${formFields.compradorNome}, CPF nº ${formFields.compradorCPF}, Estado Civil: ${formFields.compradorEstadoCivil}, data de nascimento: ${formFields.compradorNascimento}, portador da renda declarada de ${formFields.compradorRenda}, com FGTS ativo: ${formFields.compradorFGTS}.`;

        const splitsVendedor = doc.splitTextToSize(textVendedor, 170);
        doc.text(splitsVendedor, marginLeft, currentY);
        currentY += (splitsVendedor.length * 4.5) + 3;

        const splitsComprador = doc.splitTextToSize(textComprador, 170);
        doc.text(splitsComprador, marginLeft, currentY);
        currentY += (splitsComprador.length * 4.5) + 8;

        checkPageBreak(30);

        // Section II: DO OBJETO
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('2. DO OBJETO DO CONTRATO', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const textObjeto = `Cláusula Primeira: O objeto do presente instrumento de Promessa de Compra e Venda é o imóvel classificado como [${formFields.imovelTipo}], cadastrado no município competente, situado na localização correspondente a: ${formFields.imovelEndereco}, registrado de acordo com a matrícula descritiva número ${formFields.imovelMatricula}.`;
        const splitsObjeto = doc.splitTextToSize(textObjeto, 170);
        doc.text(splitsObjeto, marginLeft, currentY);
        currentY += (splitsObjeto.length * 4.5) + 8;

        checkPageBreak(30);

        // Section III: DO VALOR E MEIO DE PAGAMENTO
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('3. DO VALOR E FORMA DE PAGAMENTO', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const textValor = `Cláusula Segunda: O valor total ajustado para a compra do imóvel supra mencionado é de ${formFields.imovelValor}, a qual será liquidada sob as seguintes definições do promitente comprador:`;
        const splitsValor = doc.splitTextToSize(textValor, 170);
        doc.text(splitsValor, marginLeft, currentY);
        currentY += (splitsValor.length * 4.5) + 4;

        // Financial summary table inside the PDF
        (doc as any).autoTable({
          startY: currentY,
          head: [['Descrição do Lote de Quitação', 'Modalidade ou Órgão', 'Montante Estipulado']],
          body: [
            ['Instrumento de Financiamento', formFields.bancoFinanciamentoTipo + ` (${formFields.bancoNome})`, formFields.valorFinanciado],
            ['Uso de Recursos FGTS', formFields.compradorFGTS === 'Sim' ? 'Simulação de Saque' : 'Não utilizado', formFields.compradorFGTS === 'Sim' ? 'Parcial Sob Consulta' : 'R$ 0,00'],
            ['Valor do Imóvel Contratado', 'Valor de Avaliação', formFields.imovelValor]
          ],
          theme: 'striped',
          styles: { fontSize: 9, font: 'helvetica' },
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          margin: { left: marginLeft, right: marginLeft }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        checkPageBreak(30);

        // Section IV: PENALIDADES
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('4. DAS RESCISÕES E PENALIDADES', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const textPenas = `Cláusula Terceira: Decorrendo-se o descumprimento de qualquer ponto previsto no presente contrato de intenção de compra, a parte infratora arcará com as seguintes multas estabelecidas: ${formFields.clausulaPenal}`;
        const splitsPenas = doc.splitTextToSize(textPenas, 170);
        doc.text(splitsPenas, marginLeft, currentY);
        currentY += (splitsPenas.length * 4.5) + 12;

        checkPageBreak(40);

        // Signatures area
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text(`São Paulo, ${formFields.dataContrato}.`, marginLeft, currentY);
        currentY += 15;

        // Line and titles for signature
        doc.line(marginLeft, currentY, marginLeft + 65, currentY);
        doc.line(marginLeft + 90, currentY, marginLeft + 155, currentY);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('PROMITENTE COMPRADOR', marginLeft, currentY + 4);
        doc.text(formFields.compradorNome, marginLeft, currentY + 8);

        doc.text('SOLUTZ INTELIGÊNCIA IMOBILIÁRIA', marginLeft + 90, currentY + 4);
        doc.text('Representante Comercial', marginLeft + 90, currentY + 8);

      } else if (selectedTemplate === 'solicitacao_credito') {
        printHeader('PROPOSTA E SOLICITAÇÃO DE CRÉDITO IMOBILIÁRIO');

        // Main info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('1. DADOS CADASTRAIS DO PROPONENTE', marginLeft, currentY);
        currentY += 6;

        (doc as any).autoTable({
          startY: currentY,
          body: [
            ['Nome Completo:', formFields.compradorNome, 'CPF:', formFields.compradorCPF],
            ['Data de Nascimento:', formFields.compradorNascimento, 'Estado Civil:', formFields.compradorEstadoCivil],
            ['Email do Cliente:', formFields.compradorEmail, 'Telefone de Contato:', formFields.compradorPhone],
            ['Renda Mensal Líquida:', formFields.compradorRenda, 'Possui FGTS Ativo:', formFields.compradorFGTS]
          ],
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { fontStyle: 'bold', width: 35 },
            2: { fontStyle: 'bold', width: 35 }
          },
          margin: { left: marginLeft }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
        checkPageBreak(30);

        // Bank simulation table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('2. PLANO DE FINANCIAMENTO INTERPRETADO', marginLeft, currentY);
        currentY += 6;

        (doc as any).autoTable({
          startY: currentY,
          head: [['Variável do Crédito', 'Parâmetro Identificado no Sistema']],
          body: [
            ['Instituição Bancária Solicitante', formFields.bancoNome || 'Não Definido'],
            ['Modalidade Bancária Recomendada', formFields.bancoFinanciamentoTipo],
            ['Valor Global de Venda do Imóvel', formFields.imovelValor],
            ['Valor Total Pretendido por Financiamento', formFields.valorFinanciado],
            ['Valor Estimado de Entrada Recorrente', (parseFloat(formFields.imovelValor.replace(/[^\d]/g, '')) - parseFloat(formFields.valorFinanciado.replace(/[^\d]/g, '')) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]
          ],
          theme: 'striped',
          styles: { fontSize: 9 },
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          margin: { left: marginLeft }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
        checkPageBreak(35);

        // Required Documents Section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('3. COMPONENTES DOCUMENTAIS MANDATÓRIOS', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const docsList = [
          '• RG e CPF (ou CNH de todas as partes requerentes da renda);',
          '• Certidão de nascimento ou de casamento ativa com as devidas averbações;',
          '• Comprovantes de Rendimentos (Últimos 3 holerites para assalariados, ou extratos de 3 meses para autônomos);',
          '• Declaração de Imposto de Renda Completo do último exercício;',
          '• Extrato atual do FGTS devidamente assinado nas agências competentes para liberação.'
        ];

        docsList.forEach(docText => {
          doc.text(docText, marginLeft + 3, currentY);
          currentY += 5;
        });

        currentY += 8;
        checkPageBreak(50);

        // Legal Declaration block
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0,0,0);
        doc.text('DECLARAÇÃO DE VERACIDADE DOS DADOS', marginLeft, currentY);
        currentY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const declaracao = 'Declaro para todos os fins de direito e análises de mercado imobiliário que as informações e composições financeiras fornecidas neste formulário são complementares, correspondendo com exatidão à verdade e documentos arquivados em suporte físico.';
        const splitsDec = doc.splitTextToSize(declaracao, 170);
        doc.text(splitsDec, marginLeft, currentY);
        currentY += (splitsDec.length * 4) + 15;

        doc.line(marginLeft, currentY, marginLeft + 80, currentY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0,0,0);
        doc.text('ASSINATURA DO SOLICITANTE', marginLeft, currentY + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(formFields.compradorNome, marginLeft, currentY + 8);

      } else {
        // template is 'aprovacao_credito_comercial'
        printHeader('CARTA DE ANÁLISE E APREVAÇÃO DE CRÉDITO');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('1. DA CERTICAÇÃO DE CRÉDITO', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        const textAprova = `Certificamos que as pastas e históricos cadastrais de ${formFields.compradorNome}, CPF: ${formFields.compradorCPF}, foram submetidos à inteligência de cálculo de riscos e score de crédito imobiliário da Solutz Inteligência Imobiliária de forma integrada com a rede bancária credenciada.`;
        const splitsAprova = doc.splitTextToSize(textAprova, 170);
        doc.text(splitsAprova, marginLeft, currentY);
        currentY += (splitsAprova.length * 4.5) + 8;

        checkPageBreak(30);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0,0,0);
        doc.text('2. PLANO DE LIMITES E TAXAS APROVADOS', marginLeft, currentY);
        currentY += 6;

        (doc as any).autoTable({
          startY: currentY,
          body: [
            ['Cliente Beneficiário', formFields.compradorNome],
            ['Instituição de Crédito Conveniada', formFields.bancoNome || 'Rede Integradora de Bancos CAIXA / Itaú'],
            ['Sub-modalidade de Liberação', formFields.bancoFinanciamentoTipo],
            ['Limite Máximo de Financiamento Autorizado', formFields.valorFinanciado],
            ['Proposta de Entrada Calculada', (parseFloat(formFields.imovelValor.replace(/[^\d]/g, '')) - parseFloat(formFields.valorFinanciado.replace(/[^\d]/g, '')) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
            ['Data Limite para Assinatura em Cartório', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')]
          ],
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { fontStyle: 'bold', width: 75 } },
          margin: { left: marginLeft }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
        checkPageBreak(30);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('3. CONDIÇÕES E ETAPAS ADICIONAIS', marginLeft, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 80);
        const conditions = [
          '1. A liberação definitiva das verbas de crédito está condicionada à aprovação técnica da engenharia do imóvel;',
          '2. Inexistência de novas restrições cadastrais no CPF dos proponentes em órgãos restritivos;',
          '3. Apresentação física dos originais para conferência biométrica junto ao correspondente administrativo.'
        ];

        conditions.forEach(cond => {
          const splitCond = doc.splitTextToSize(cond, 170);
          doc.text(splitCond, marginLeft, currentY);
          currentY += (splitCond.length * 4.5) + 2;
        });

        currentY += 15;
        checkPageBreak(50);

        doc.line(marginLeft, currentY, marginLeft + 80, currentY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(0,0,0);
        doc.text('DIRETORIA DE OPERAÇÕES E CRÉDITO', marginLeft, currentY + 4);
        doc.setFont('helvetica', 'normal');
        doc.text('Solutz Inteligência Setorial', marginLeft, currentY + 8);
      }

      // Download Trigger
      const sanitizedName = formFields.compradorNome.toLowerCase().replace(/\s+/g, '_');
      doc.save(`${selectedTemplate}_${sanitizedName}.pdf`);

      showToast({
        type: 'success',
        title: 'Documento PDF Gerado! 📄',
        description: 'Seu documento oficial foi compilado e o download foi iniciado.',
      });

    } catch (err) {
      console.error('Erro ao gerar o PDF no browser:', err);
      showToast({
        type: 'error',
        title: 'Falha na Compilação PDF',
        description: 'Houve uma falha inesperada ao tentar compilar e formatar as tabelas do PDF comercial.',
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Panel / Form Selection - Column size 5 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-5">
            <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-black/60" /> Clientes
            </h3>

            {/* Selectors */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black/50 uppercase tracking-wider mb-2">Cliente 1</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-black/40 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Selecione ou busque o Cliente 1..."
                    value={client1SearchQuery}
                    onChange={(e) => {
                      setClient1SearchQuery(e.target.value);
                      if (!e.target.value) {
                        setSelectedClientId('');
                      }
                    }}
                    onFocus={() => setShowClient1Dropdown(true)}
                    onBlur={() => setTimeout(() => setShowClient1Dropdown(false), 200)}
                    className="w-full text-sm bg-[#f5f5f0] border border-black/5 rounded-2xl pl-10 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-black font-medium"
                    disabled={loadingData}
                  />
                  {selectedClientId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId('');
                        setClient1SearchQuery('');
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  ) : (
                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-black/30 pointer-events-none" />
                  )}

                  {showClient1Dropdown && (
                    <div className="absolute top-full left-0 z-20 mt-1 w-full bg-white rounded-2xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                      {clients
                        .filter(c => c.name.toLowerCase().includes(client1SearchQuery.toLowerCase()))
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedClientId(c.id || '');
                              setClient1SearchQuery(c.name);
                              setShowClient1Dropdown(false);
                            }}
                            className="w-full text-left text-xs p-2.5 hover:bg-black/5 rounded-xl transition-all flex items-center justify-between group text-black/70 font-semibold"
                          >
                            <span>{c.name} {c.cpf ? `(CPF: ${c.cpf})` : ''}</span>
                            <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-black/60" />
                          </button>
                        ))}
                      {clients.filter(c => c.name.toLowerCase().includes(client1SearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-xs text-black/40 p-3 text-center font-medium">Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/50 uppercase tracking-wider mb-2">Cliente 2</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-black/40 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Selecione ou busque o Cliente 2..."
                    value={client2SearchQuery}
                    onChange={(e) => {
                      setClient2SearchQuery(e.target.value);
                      if (!e.target.value) {
                        setSelectedClient2Id('');
                      }
                    }}
                    onFocus={() => setShowClient2Dropdown(true)}
                    onBlur={() => setTimeout(() => setShowClient2Dropdown(false), 200)}
                    className="w-full text-sm bg-[#f5f5f0] border border-black/5 rounded-2xl pl-10 pr-10 py-3.5 focus:outline-none focus:ring-2 focus:ring-black font-medium"
                    disabled={loadingData}
                  />
                  {selectedClient2Id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient2Id('');
                        setClient2SearchQuery('');
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  ) : (
                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-black/30 pointer-events-none" />
                  )}

                  {showClient2Dropdown && (
                    <div className="absolute top-full left-0 z-20 mt-1 w-full bg-white rounded-2xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                      {clients
                        .filter(c => c.id !== selectedClientId && c.name.toLowerCase().includes(client2SearchQuery.toLowerCase()))
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient2Id(c.id || '');
                              setClient2SearchQuery(c.name);
                              setShowClient2Dropdown(false);
                            }}
                            className="w-full text-left text-xs p-2.5 hover:bg-black/5 rounded-xl transition-all flex items-center justify-between group text-black/70 font-semibold"
                          >
                            <span>{c.name} {c.cpf ? `(CPF: ${c.cpf})` : ''}</span>
                            <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-black/60" />
                          </button>
                        ))}
                      {clients.filter(c => c.id !== selectedClientId && c.name.toLowerCase().includes(client2SearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-xs text-black/40 p-3 text-center font-medium">Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab 1: Emissores Oficiais do Sistema (PDF) */}
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
            <h3 className="text-base font-bold tracking-tight">Emissão Automática de PDF</h3>
            <p className="text-xs text-black/60">Gere e baixe relatórios, contratos e solicitações com formatação timbrada oficial da Solutz.</p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedTemplate('contrato_compra_venda')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                  selectedTemplate === 'contrato_compra_venda'
                    ? 'bg-black text-white border-black shadow'
                    : 'bg-[#f5f5f0]/50 border-black/5 hover:bg-[#f5f5f0] text-black'
                }`}
              >
                <FileSignature className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold font-sans">Contrato de Compra e Venda</h4>
                  <p className="text-[10px] opacity-70 mt-0.5 font-medium leading-relaxed">Insere automaticamente dados do imóvel, comprador, financiamento e penalidades.</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedTemplate('solicitacao_credito')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                  selectedTemplate === 'solicitacao_credito'
                    ? 'bg-black text-white border-black shadow'
                    : 'bg-[#f5f5f0]/50 border-black/5 hover:bg-[#f5f5f0] text-black'
                }`}
              >
                <FileText className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold font-sans">Ficha de Solicitação de Crédito</h4>
                  <p className="text-[10px] opacity-70 mt-0.5 font-medium leading-relaxed">Documento unificado com a renda, certidões anexas e termos de responsabilidade.</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedTemplate('aprovacao_credito_comercial')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                  selectedTemplate === 'aprovacao_credito_comercial'
                    ? 'bg-black text-white border-black shadow'
                    : 'bg-[#f5f5f0]/50 border-black/5 hover:bg-[#f5f5f0] text-black'
                }`}
              >
                <FileCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold font-sans">Carta de Aprovação de Crédito</h4>
                  <p className="text-[10px] opacity-70 mt-0.5 font-medium leading-relaxed">Declaração de viabilidade comercial contendo limite de parcelas concedido pelo analista.</p>
                </div>
              </button>
            </div>

            <button
              onClick={handleGeneratePDF}
              disabled={!selectedClientId}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all shadow ${
                selectedClientId 
                  ? 'bg-black hover:bg-black/90 text-white active:scale-98' 
                  : 'bg-black/10 text-black/40 cursor-not-allowed shadow-none'
              }`}
            >
              <Download className="w-4 h-4" /> Baixar PDF Timbrado Oficial
            </button>
          </div>

          {/* Tab 2: Word templates upload (.docx) */}
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
            <h3 className="text-base font-bold tracking-tight">Utilizar seus próprios Modelos (.docx)</h3>
            <p className="text-xs text-black/60">Anexe qualquer documento Word padrão contendo tags (como e.g. <code className="bg-black/5 px-1 py-0.5 rounded font-bold font-mono text-[10px]">&#123;&#123;nome&#125;&#125;</code>) e receba preenchido.</p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => docxInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all ${
                isDragActive 
                  ? 'border-black bg-black/5 escala-98' 
                  : customFile 
                    ? 'border-emerald-500 bg-emerald-50/20' 
                    : 'border-black/10 hover:border-black/30'
              }`}
            >
              <input
                ref={docxInputRef}
                type="file"
                accept=".docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              {customFile ? (
                <>
                  <FileCheck className="w-10 h-10 text-emerald-500" />
                  <div className="text-xs font-bold text-emerald-800 break-all">{customFile.name}</div>
                  <div className="text-[10.5px] text-black/40">Clique para substituir o arquivo</div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-black/40" />
                  <div className="text-xs font-bold">Arraste ou clique para buscar arquivo .docx</div>
                  <div className="text-[10px] text-black/40">Aceita apenas documentos com extensão .docx</div>
                </>
              )}
            </div>

            {/* List tags instructions */}
            <details className="text-xs bg-[#f5f5f0] rounded-2xl p-3 border border-black/5 cursor-pointer">
              <summary className="font-bold outline-none select-none flex items-center justify-between">
                <span>Visualizar Tabela de Tags Válidas</span>
                <ChevronRight className="w-4 h-4 text-black/65" />
              </summary>
              <div className="mt-3.5 space-y-2.5 font-medium border-t border-black/5 pt-3.5 pr-1 max-h-56 overflow-y-auto sidebar-scrollbar">
                <p className="font-bold text-[10.5px] text-black/50 uppercase tracking-wider">Tags de Pessoa (Comprador)</p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-black/70">
                  <div>&#123;&#123;nome&#125;&#125;</div>
                  <div className="text-black/50">Nome Completo</div>
                  <div>&#123;&#123;cpf&#125;&#125;</div>
                  <div className="text-black/50">CPF Formatado</div>
                  <div>&#123;&#123;email&#125;&#125;</div>
                  <div className="text-black/50">E-mail</div>
                  <div>&#123;&#123;telefone&#125;&#125;</div>
                  <div className="text-black/50">Telefone</div>
                  <div>&#123;&#123;renda&#125;&#125;</div>
                  <div className="text-black/50">Renda Mensal</div>
                  <div>&#123;&#123;fgts&#125;&#125;</div>
                  <div className="text-black/50">fgts (Sim/Não)</div>
                  <div>&#123;&#123;estado_civil&#125;&#125;</div>
                  <div className="text-black/50">Estado Civil</div>
                </div>
                <p className="font-bold text-[10.5px] text-black/50 uppercase tracking-wider mt-3">Tags Imobiliárias & do Financiamento</p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-black/70">
                  <div>&#123;&#123;imovel_endereco&#125;&#125;</div>
                  <div className="text-black/50">Endereço completo</div>
                  <div>&#123;&#123;imovel_valor&#125;&#125;</div>
                  <div className="text-black/50">Valor de Venda</div>
                  <div>&#123;&#123;imovel_matricula&#125;&#125;</div>
                  <div className="text-black/50">Nº de Matrícula</div>
                  <div>&#123;&#123;banco&#125;&#125;</div>
                  <div className="text-black/50">Banco Vinculado</div>
                  <div>&#123;&#123;valor_financiado&#125;&#125;</div>
                  <div className="text-black/50">Limite Financiado</div>
                  <div>&#123;&#123;data_hoje&#125;&#125;</div>
                  <div className="text-black/50">Data de Geração</div>
                </div>
              </div>
            </details>

            <button
              onClick={handleGenerateFilledDocx}
              disabled={!customFile || !selectedClientId}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs transition-all shadow ${
                customFile && selectedClientId
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                  : 'bg-black/10 text-black/40 cursor-not-allowed shadow-none'
              }`}
            >
              <Download className="w-4 h-4" /> Preencher & Baixar Word (.docx)
            </button>
          </div>
        </div>

        {/* Right Preview Sheet and Fine Tuning Form - Column size 7 */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-black/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight">Campos Gerados & Edição de Ajuste</h3>
                <p className="text-[11px] text-black/40 mt-1 leading-relaxed">Você pode revisar e alterar livremente os textos antes da compilação do documento.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-full font-bold select-none">
                  <FileEdit className="w-3.5 h-3.5 text-sky-600" /> Modo Dinâmico Ativo
                </span>
              </div>
            </div>

            {/* Editable Form Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Qualidade do Vendedor (Imobiliária)</label>
                <input
                  type="text"
                  value={formFields.vendedorNome}
                  onChange={(e) => setFormFields(prev => ({ ...prev, vendedorNome: e.target.value }))}
                  className="w-full text-xs font-semibold bg-[#f5f5f0] border border-black/5 px-3 py-2.5 rounded-xl hover:bg-[#eaeae0] focus:outline-none focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">CNPJ do Vendedor</label>
                <input
                  type="text"
                  value={formFields.vendedorCNPJ}
                  onChange={(e) => setFormFields(prev => ({ ...prev, vendedorCNPJ: e.target.value }))}
                  className="w-full text-xs font-semibold bg-[#f5f5f0] border border-black/5 px-3 py-2.5 rounded-xl hover:bg-[#eaeae0] focus:outline-none focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Endereço do Vendedor</label>
                <input
                  type="text"
                  value={formFields.vendedorEndereco}
                  onChange={(e) => setFormFields(prev => ({ ...prev, vendedorEndereco: e.target.value }))}
                  className="w-full text-xs font-semibold bg-[#f5f5f0] border border-black/5 px-3 py-2.5 rounded-xl hover:bg-[#eaeae0] focus:outline-none focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Nome do Comprador (Cliente)</label>
                <input
                  type="text"
                  value={formFields.compradorNome}
                  onChange={(e) => setFormFields(prev => ({ ...prev, compradorNome: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Selecione um cliente acima ou digite"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">CPF do Comprador</label>
                <input
                  type="text"
                  value={formFields.compradorCPF}
                  onChange={(e) => setFormFields(prev => ({ ...prev, compradorCPF: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="CPF do Cliente"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Estado Civil</label>
                <input
                  type="text"
                  value={formFields.compradorEstadoCivil}
                  onChange={(e) => setFormFields(prev => ({ ...prev, compradorEstadoCivil: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Renda Declarada</label>
                <input
                  type="text"
                  value={formFields.compradorRenda}
                  onChange={(e) => setFormFields(prev => ({ ...prev, compradorRenda: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Descrição / Endereço do Imóvel</label>
                <input
                  type="text"
                  value={formFields.imovelEndereco}
                  onChange={(e) => setFormFields(prev => ({ ...prev, imovelEndereco: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Endereço do imóvel correspondente"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Matrícula Regulamentar</label>
                <input
                  type="text"
                  value={formFields.imovelMatricula}
                  onChange={(e) => setFormFields(prev => ({ ...prev, imovelMatricula: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Número de Registro de Matrícula"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Valor Pactuado do Imóvel</label>
                <input
                  type="text"
                  value={formFields.imovelValor}
                  onChange={(e) => setFormFields(prev => ({ ...prev, imovelValor: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Financiamento - Banco Solicitado</label>
                <input
                  type="text"
                  value={formFields.bancoNome}
                  onChange={(e) => setFormFields(prev => ({ ...prev, bancoNome: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Banco financiador sugerido"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Valor de Financiamento Recomendado</label>
                <input
                  type="text"
                  value={formFields.valorFinanciado}
                  onChange={(e) => setFormFields(prev => ({ ...prev, valorFinanciado: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Cláusulas de Penalidade</label>
                <textarea
                  rows={2}
                  value={formFields.clausulaPenal}
                  onChange={(e) => setFormFields(prev => ({ ...prev, clausulaPenal: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Testemunha 1</label>
                <input
                  type="text"
                  value={formFields.testemunha1}
                  onChange={(e) => setFormFields(prev => ({ ...prev, testemunha1: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black animate-none"
                  placeholder="Nome de Testemunha 1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-black/40 uppercase mb-1">Testemunha 2</label>
                <input
                  type="text"
                  value={formFields.testemunha2}
                  onChange={(e) => setFormFields(prev => ({ ...prev, testemunha2: e.target.value }))}
                  className="w-full text-xs font-semibold bg-white border border-black/10 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-black animate-none"
                  placeholder="Nome de Testemunha 2"
                />
              </div>
            </div>
            
            {/* Realtime Live Visual Paper Preview Sheet */}
            <div className="bg-[#f5f5f0] border-t border-black/5 p-6 flex flex-col items-center">
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-40 mb-3 block select-none">
                Pré-visualização do Documento (Visualização A4)
              </span>

              {/* A4 Visual Block */}
              <div 
                className="bg-white w-full border border-black/10 rounded-2xl p-8 max-w-2xl shadow-md flex flex-col relative text-[11px] font-serif leading-relaxed text-[#1a1a1a]"
                style={{ minHeight: '440px' }}
              >
                {/* Branding minimal header */}
                <div className="flex justify-between items-start border-b border-black/5 pb-4 mb-4">
                  <div>
                    <h1 className="font-sans font-black text-sm tracking-tight text-black">SOLUTZ</h1>
                    <p className="font-sans text-[8px] text-black/40 mt-0.5 tracking-wider font-bold">EMISSÃO INTEGRADA</p>
                  </div>
                  <div className="text-right font-sans text-[8px] text-black/50 space-y-0.5">
                    <p className="font-bold">DOCUMENTO SEGURO</p>
                    <p>CÓD: SOL-DOC-{selectedClientId ? selectedClientId.substring(0, 8).toUpperCase() : 'NIL'}</p>
                    <p>DATA: {formFields.dataContrato}</p>
                  </div>
                </div>

                {/* Content body based on selected template */}
                {selectedTemplate === 'contrato_compra_venda' ? (
                  <div className="space-y-4">
                    <h2 className="text-xs font-sans font-bold text-center tracking-tight text-black border-y border-black/5 py-1.5 grayscale">
                      CONTRATO DE PROMESSA DE COMPRA E VENDA DE IMÓVEL
                    </h2>
                    
                    <p>
                      <strong>PROMITENTE VENDEDOR:</strong> {formFields.vendedorNome || '...'}, inscrito no CNPJ sob o nº {formFields.vendedorCNPJ || '...'}, com sede em {formFields.vendedorEndereco || '...'}.
                    </p>
                    <p>
                      <strong>PROMITENTE COMPRADOR:</strong> {formFields.compradorNome || 'Nenhum cliente selecionado'}, CPF nº {formFields.compradorCPF || '...'}, com renda de {formFields.compradorRenda || '...'}, Estado Civil: {formFields.compradorEstadoCivil || 'Solteiro'}.
                    </p>

                    <p>
                      <strong>CLÁUSULA PRIMEIRA - DO OBJETO:</strong> O objeto deste instrumento é o imóvel imobiliário situado na localidade de {formFields.imovelEndereco || '[Não cadastrado]'}, de tipologia {formFields.imovelTipo}. inscrito sob a matrícula regulamentar do cartório sob nº {formFields.imovelMatricula || '...'}.
                    </p>

                    <p>
                      <strong>CLÁUSULA SEGUNDA - DO VALOR E ENTRADA:</strong> Fica estipulado o valor final de <strong>{formFields.imovelValor || 'R$ 0,00'}</strong> para a quitação total do imóvel, sendo financiado o quantitativo de {formFields.valorFinanciado || 'R$ 0,00'} por intermédio da instituição {formFields.bancoNome || '[Indefinido]'} sob a modalidade {formFields.bancoFinanciamentoTipo}.
                    </p>

                    <p>
                      <strong>CLÁUSULA TERCEIRA - MULTA CONTRATUAL:</strong> {formFields.clausulaPenal}
                    </p>
                  </div>
                ) : selectedTemplate === 'solicitacao_credito' ? (
                  <div className="space-y-4">
                    <h2 className="text-xs font-sans font-bold text-center tracking-tight text-black border-y border-black/5 py-1.5">
                      PASTA E MODELO DE CADASTRO E SOLICITAÇÃO DE CRÉDITO
                    </h2>
                    
                    <table className="w-full border-collapse border border-black/10 text-[10px] font-sans">
                      <tbody>
                        <tr>
                          <td className="border border-black/10 p-2 font-bold bg-black/5 w-1/3">Cliente Solicitante</td>
                          <td className="border border-black/10 p-2">{formFields.compradorNome || '...'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black/10 p-2 font-bold bg-black/5">Documento de CPF</td>
                          <td className="border border-black/10 p-2">{formFields.compradorCPF || '...'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black/10 p-2 font-bold bg-black/5">Renda Cadastrada</td>
                          <td className="border border-black/10 p-2">{formFields.compradorRenda || '...'}</td>
                        </tr>
                        <tr>
                          <td className="border border-black/10 p-2 font-bold bg-black/5">Plano Bancário Estimado</td>
                          <td className="border border-black/10 p-2">{formFields.bancoNome || 'Não Definido'} - Modalidade {formFields.bancoFinanciamentoTipo}</td>
                        </tr>
                        <tr>
                          <td className="border border-black/10 p-2 font-bold bg-black/5">Limite Solicitado</td>
                          <td className="border border-black/10 p-2">{formFields.valorFinanciado || '...'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="text-[10px] text-black/50 italic mt-4 font-sans leading-relaxed">
                      Este documento é um rascunho de conferência de dados extraído diretamente do banco de dados operacional Solutz. O PDF final gerará o carimbo e formato oficial com as linhas de veracidade.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-xs font-sans font-bold text-center tracking-tight text-black border-y border-black/5 py-1.5">
                      CARTA DE VIABILIDADE E PRÉ-APROVAÇÃO DE CRÉDITO COMERCIAL
                    </h2>
                    
                    <p>
                      Declaramos para as devidas análises mercantis que o requerente <strong>{formFields.compradorNome || '...'}</strong> possui viabilidade pré-analisada pelo comitê técnico da Solutz Inteligência Imobiliária para fins de concessão de linha de crédito bancária.
                    </p>

                    <p>
                      <strong>Parâmetros de Concessão de Renda:</strong>
                    </p>
                    <ul className="list-disc pl-5 font-sans text-[10px] space-y-1">
                      <li>Instituição Integradora Sugerida: {formFields.bancoNome || 'Rede de Bancos'};</li>
                      <li>Modalidade de Garantia: {formFields.bancoFinanciamentoTipo || 'SBPE'};</li>
                      <li>Valor de Financiamento Identificado: {formFields.valorFinanciado || 'R$ 0,00'}.</li>
                    </ul>

                    <p className="text-[10px] text-black/60 font-sans italic mt-4">
                      Aprovado por comitê de crédito unificado. Válido por 30 dias contados a partir da data de expedição deste documento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
