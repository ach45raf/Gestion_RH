import React, { useState, useEffect } from "react";
import axios from "axios";
import Navigation from "../Acceuil/Navigation";
import Swal from "sweetalert2";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import { Autocomplete, Checkbox, Fab, ListItemIcon, TextField, Toolbar } from "@mui/material";
import { Form, Button, Modal, Table, Dropdown } from "react-bootstrap";
import "../style.css";
import Search from "../Acceuil/Search";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faFilePdf, faPrint, faPlus, faMinus, faEdit, faFilter, faClose, faFileExcel, } from "@fortawesome/free-solid-svg-icons";
import TablePagination from "@mui/material/TablePagination";
import Select from "react-dropdown-select";
import { width } from "@mui/system";
import DescriptionIcon from "@mui/icons-material/Description";
import { useAuth } from "../AuthContext";
import { useOpen } from "../Acceuil/OpenProvider";
import { FaPlus } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { deleteDataFromIndexedDB, getDataFromIndexedDB, storeDataInIndexedDB } from "../utils/indexedDBUtils";
import AddButton from "../components/AddButton";
import FilterToggleButton from "../components/FilterToggleButton";
import TableContainer from "../components/TableContainer";
import FilterComponent from "../components/FilterComponent";
const BonCommandeAchat = () => {
  const [factures, setFactures] = useState([]);
  const [LigneFacture, setLigneFacture] = useState([]);
  const [clients, setClients] = useState([]);
  const [devises, setDevises] = useState([]);
  const [authId, setAuthId] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);

  const [selectedClient, setSelectedClient] = useState([]);
  const [widthtable, setwidthtable] = useState({ width: "100%" })
  const csrfTokenMeta = document.head.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfTokenMeta ? csrfTokenMeta.content : null;
  const [editingFacture, setEditingFacture] = useState(null); // State to hold the devis being edited
  const [errors, setErrors] = useState({});
  const { open } = useOpen();
  const { dynamicStyles } = useOpen();


  const [formData, setFormData] = useState({
    reference: "",
    date: new Date().toISOString().split('T')[0],
    ref_BL: "",
    ref_BC: "",
    modePaiement: "",
    total_ttc: "",
    client_id: "",
    user_id: "",
    dateLivraison: new Date().toISOString().split('T')[0],
    Code_produit: "",
    designation: "",
    prix_vente: "",
    quantite: "",
    id_facture: "",
    dateLivraisonSouhaitable: new Date().toISOString().split('T')[0],
  });
  const tableHeaderStyle = {
    background: "#007bff",
    padding: "10px",
    textAlign: "left",
    borderBottom: "1px solid ##007bff",
  };

  const [formContainerStyle, setFormContainerStyle] = useState({ right: '-100%' });
  const [tableContainerStyle, setTableContainerStyle] = useState({ width: '100%' });
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [produits, setProduits] = useState([]);
  const [selectedProductsData, setSelectedProductsData] = useState([]);
  const [modifiedQuantiteValues, setModifiedQuantiteValues] = useState({});
  const [modifiedPrixValues, setModifiedPrixValues] = useState({});
  const [modifiedTVA, setModifiedTVA] = useState({});


  const [filteredfactures, setFilteredfactures] = useState([]);
  const [ttc, setTtc] = useState()

  const handleAddEmptyRow = () => {
    setSelectedProductsData([...selectedProductsData, {}]);
    console.log("selectedProductData", selectedProductsData);
  };
  const toggleRow = async (factureId) => {
    if (!expandedRows.includes(factureId)) {
      try {
        // Récupérer les lignes de facture associées à cette facture
        const lignefactures = await fetchLignefacture(factureId);

        // Mettre à jour l'état pour inclure les lignes de facture récupérées
        setFactures((prevFactures) => {
          return prevFactures.map((facture) => {
            if (facture.id === factureId) {
              return { ...facture, lignefactures }; // Renommer ici pour correspondre à la clé
            }
            return facture;
          });
        });

        // Ajouter l'ID de la facture aux lignes étendues
        setExpandedRows([...expandedRows, factureId]);
        console.log("expandedRows", expandedRows);
      } catch (error) {
        console.error('Erreur lors de la récupération des lignes de facture:', error);
      }
    }
  };
  const handleShowLigneFactures = async (factureId) => {
    setExpandedRows((prevRows) =>
      prevRows.includes(factureId)
        ? prevRows.filter((row) => row !== factureId)
        : [...prevRows, factureId]
    );
  };
  console.log('fact', formData)
  useEffect(() => {
    // Préchargement des lignes de facture pour chaque facture
    factures.forEach(async (facture) => {
      if (!facture.lignefactures) {
        try {
          const lignefactures = await fetchLignefacture(facture.id);
          setFactures((prevFactures) => {
            return prevFactures.map((prevFacture) => {
              if (prevFacture.id === facture.id) {
                return { ...prevFacture, lignefactures };
              }
              return prevFacture;
            });
          });
        } catch (error) {
          console.error('Erreur lors du préchargement des lignes de facture:', error);
        }
      }
    });
  }, []); // Le tableau de dépendances vide signifie que ce useEffect ne sera exécuté qu'une seule fois après le montage du composant


  const [modifiedNBREUValues, setModifiedNBREUValues] = useState({});
  const [modifiedQuantiteUValues, setModifiedQuantiteUValues] = useState({});
  const [modifiedPUValues, setModifiedPUValues] = useState({});
  const [modifiedNlot, setModifiedNlot] = useState({});

  const handleInputChange = (index, inputType, event) => {
    const newValue = event.target.value;

    if (selectedProductsData[index]) {
      const productId = selectedProductsData[index].produit_id;

      if (inputType === "prix_vente") {
        setModifiedPrixValues((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      } else if (inputType === "quantite") {
        setModifiedQuantiteValues((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      } else if (inputType === "TVA") {
        setModifiedTVA((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      } else if (inputType === "NBREU") {
        setModifiedNBREUValues((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      } else if (inputType === "quantiteU") {
        setModifiedQuantiteUValues((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      } else if (inputType === "PU") {
        setModifiedPUValues((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      } else if (inputType === "Nlot") {
        setModifiedNlot((prev) => ({
          ...prev,
          [`${index}_${productId}`]: newValue,
        }));
      }
      console.log('mofier', modifiedPUValues)
    }
  };
  const handleDeleteProduct = (index, id) => {
    // Afficher la boîte de dialogue avec Swal
    Swal.fire({
      title: "Êtes-vous sûr de vouloir supprimer ce produit ?",
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Oui",
      denyButtonText: "Non",
      customClass: {
        actions: "my-actions",
        cancelButton: "order-1 right-gap",
        confirmButton: "order-2",
        denyButton: "order-3",
      },
    }).then((result) => {
      // Si l'utilisateur confirme la suppression
      if (result.isConfirmed) {
        const updatedSelectedProductsData = [...selectedProductsData];
        updatedSelectedProductsData.splice(index, 1);
        setSelectedProductsData(updatedSelectedProductsData);

        if (id) {
          axios
            .delete(`http://localhost:8000/api/ligne_bon_commande/${id}`)
            .then(() => {
              fetchFactures(); // Rafraîchir les factures après la suppression
            })
            .catch((error) => {
              console.error('Erreur lors de la suppression:', error);
            });
        }

        // Afficher un message de succès après la suppression
        Swal.fire('Supprimé !', 'Le produit a été supprimé.', 'success');
      } else if (result.isDenied) {
        // Si l'utilisateur a choisi de ne pas supprimer
        Swal.fire('Annulé', 'Le produit n\'a pas été supprimé', 'info');
      }
    });
  };


  const getElementValueById = (id) => {
    return document.getElementById(id)?.value || "";
  };


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClientSelection = (selected) => {
    if (selected) {
      setSelectedClient(selected);
      console.log("selectedClient", selectedClient);
    } else {
      setSelectedClient(null);
    }
  };

  const { user } = useAuth();
  console.log('user', user)
  const [modePaimant, setModePaimant] = useState([]);
  const fetchFactures = async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/getAllDataBonCommandeAchat");

      setModePaimant(response.data.modpai.data);

      // Stocker les données dans IndexedDB
      await storeDataInIndexedDB(response.data.bonC.data, 'bonCommandeAchat');
      await storeDataInIndexedDB(response.data.clients.data, 'fournisseurs');
      await storeDataInIndexedDB(response.data.produits.data, 'produits');

      // Mettre à jour les états React
      setFactures(response.data.bonC.data);
      setClients(response.data.clients.data);
      setLigneFacture(response.data.ligneFactures);
      setProduits(response.data.produits.data?.filter((G) => G.genre !== 'vente'));

      console.log("Données chargées:", response.data);

    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
    }
  };
  useEffect(() => {
    const fetchDataFromIndexedDB = async () => {
      try {
        const facturesFromDB = await getDataFromIndexedDB('bonCommandeAchat');
        const clientFromDB = await getDataFromIndexedDB('fournisseurs');
        const produitFromDB = await getDataFromIndexedDB('produits');


        if (facturesFromDB.length > 0 && clientFromDB.length > 0) {
          setFactures(facturesFromDB);
          setClients(clientFromDB);
          setProduits(produitFromDB?.filter((G) => G.genre !== 'vente'))
        }
        // Si les données n'existent pas, effectuer l'appel API
        fetchFactures();

      } catch (error) {
        console.error("Erreur lors de la récupération des données IndexedDB:", error);
        fetchFactures();  // Appel API en cas d'erreur
      }
    };

    fetchDataFromIndexedDB();
  }, []);



  useEffect(() => {
    const filtered = factures.filter((devis) => {
      const searchString = searchTerm.toLowerCase();
      return (
        (devis.type && devis.type === 'F') && (
          (devis.reference && devis.reference.toLowerCase().includes(searchString)) ||
          (devis.date && devis.date.toLowerCase().includes(searchString)) ||
          (devis.modePaiement && devis.modePaiement.toLowerCase().includes(searchString)) ||
          (clients.find((cl) => cl.id === devis.client_id) && String(clients.find((cl) => cl.id === devis.client_id).raison_sociale).toLowerCase().includes(searchString)) ||
          (devis.validation_offer && devis.validation_offer.toLowerCase().includes(searchString)) ||
          (devis.status && devis.status.toLowerCase().includes(searchString)))
      );
    });
    setFilteredfactures(filtered);
  }, [factures, searchTerm]);
  const handleSearch = (term) => {
    setSearchTerm(term);
  };
  function generateUniqueReference() {
    const date = new Date();

    // Récupérer les deux derniers chiffres de l'année
    const year = date.getFullYear().toString().slice(-2);

    // Charger le compteur depuis localStorage, ou initialiser à 1
    let counter = localStorage.getItem("uniqueCounterBCACHAT");
    counter = counter ? parseInt(counter) + 1 : 1;

    // Sauvegarder le compteur incrémenté
    localStorage.setItem("uniqueCounterBCACHAT", counter);

    // Format du compteur avec des zéros en tête
    const formattedCounter = String(counter).padStart(5, "0");

    return `${year}/${formattedCounter}`;
  }
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      Swal.fire({
        title: 'Traitement en cours...',
        text: 'Veuillez patienter pendant le traitement de votre demande',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      try {

        // const userResponse = await axios.get("http://localhost:8000/api/users", {
        //   withCredentials: true,
        //   headers: {
        //     "X-CSRF-TOKEN": csrfToken,
        //   },
        // });

        // const authenticatedUserId = userResponse.data[0].id;
        // console.log("auth user", authenticatedUserId);
        // Préparer les données du Devis
        console.log("authId", authId)
        console.log("selectedClient", selectedClient)
        const FactureData = {
          date: formData.date,
          dateLivraison: formData.dateLivraison,
          dateLivraisonSouhaitable: formData.dateLivraisonSouhaitable,


          ref_BL: formData.ref_BL,
          ref_BC: formData.ref_BC,
          modePaiement: formData.modePaiement,
          reference: formData.reference,
          client_id: formData.siteClient_id ? formData.siteClient_id : formData.client_id,
          user_id: user.id,
          type: 'F'
        };

        console.log('formfactur', FactureData)
        let response;
        if (editingFacture) {
          // Mettre à jour le Devis existant
          response = await axios.put(
            `http://localhost:8000/api/bons_commande/${editingFacture.id}`,
            {
              date: formData.date,
              ref_BL: formData.ref_BL,
              ref_BC: formData.ref_BC,
              modePaiement: formData.modePaiement,
              total_ttc: formData.total_ttc,
              reference: formData.reference,
              client_id: formData.siteClient_id ? formData.siteClient_id : formData.client_id,
              dateLivraison: formData.dateLivraison,
              dateLivraisonSouhaitable: formData.dateLivraisonSouhaitable,


              user_id: user.id,

            }
          );

          const selectedPrdsData = selectedProductsData.map((selectProduct, index) => {
            // Initialisation des variables
            let TVA = 20; // Valeur par défaut
            let NBREU = null;
            let quantiteU = null;
            let prixU = null;
            let quantite = null;
            let prixUnitaire = null;
            let quantiteGet = null;
            let prixUnitairGet = null;
            let NBREUGet = null;
            let prixUGet = null;
            quantiteU = Number(selectProduct?.unite);
            let ttc;
            let tt;
            // Récupération des données spécifiques selon le type_quantite
            if (selectProduct.type_quantite === 'unite') {

              TVA = getElementValueById(`TVA_${index}_${selectProduct.produit_id}`) || 20;

              NBREU = getElementValueById(`NBREU_${index}_${selectProduct.produit_id}`) || selectProduct.NBREU;
              quantiteU = Number(selectProduct?.unite);

              prixU = getElementValueById(`PU_${index}_${selectProduct.produit_id}`) || selectProduct.prixU;

              quantite = Number(NBREU) * Number(quantiteU);
              prixUnitaire = Number(prixU) / Number(quantiteU);
              ttc = Number(NBREU) * Number(prixU) * (1 + Number(TVA) / 100) // Total TTC
              tt = Number(NBREU) * Number(prixU)
            } else if (selectProduct.type_quantite === 'kg/unite') {
              TVA = getElementValueById(`TVA_${index}_${selectProduct.produit_id}`) || 20;

              NBREUGet = getElementValueById(`NBREU_${index}_${selectProduct.produit_id}`);
              quantiteU = Number(selectProduct?.unite);

              prixUGet = getElementValueById(`PU_${index}_${selectProduct.produit_id}`);
              quantiteGet = getElementValueById(`quantite_${index}_${selectProduct.produit_id}`);
              prixUnitairGet = getElementValueById(`prix_unitaire_${index}_${selectProduct.produit_id}`);
              if (!NBREUGet && prixUGet) {
                NBREUGet = selectProduct.NBREU
              } else if (NBREUGet && !prixUGet) {
                prixUGet = selectProduct.prixU
              } else if (!quantiteGet && prixUnitairGet) {
                quantiteGet = selectProduct.quantite
              } else if (quantiteGet && !prixUnitairGet) {
                prixUnitairGet = selectProduct.prix_vente
              } else if (!NBREUGet && !prixUGet) {
                prixUGet = selectProduct.prixU
                NBREUGet = selectProduct.NBREU

              } else if (!quantiteGet && !prixUnitairGet) {
                quantiteGet = selectProduct.quantite
                prixUnitairGet = selectProduct.prix_vente

              }
              NBREU = NBREUGet ? NBREUGet : Number(quantiteGet) / Number(quantiteU)
              prixU = prixUGet ? prixUGet : Number(prixUnitairGet) * Number(quantiteU)
              quantite = quantiteGet ? quantiteGet : Number(NBREU) * Number(quantiteU);
              prixUnitaire = prixUnitairGet ? prixUnitairGet : Number(prixU) / Number(quantiteU);
              ttc = Number(quantite) * Number(prixUnitaire) * (1 + Number(TVA) / 100) // Total TTC
              tt = Number(quantite) * Number(prixUnitaire)
            } else {
              quantite = getElementValueById(`quantite_${index}_${selectProduct.produit_id}`) || selectProduct.quantite;
              prixUnitaire = getElementValueById(`prix_unitaire_${index}_${selectProduct.produit_id}`) || selectProduct.prix_vente;
              TVA = getElementValueById(`TVA_${index}_${selectProduct.produit_id}`) || 20;
              if (quantiteU) {
                NBREU = Number(quantite) / Number(quantiteU)
                prixU = Number(prixUnitaire) * Number(quantiteU)
              }
              ttc = Number(quantite) * Number(prixUnitaire) * (1 + Number(TVA) / 100) // Total TTC
              tt = Number(quantite) * Number(prixUnitaire)
            }

            // Retour de chaque ligne de facture
            return {
              id: selectProduct.id,
              id_BC: editingFacture.id,
              produit_id: selectProduct.produit_id,
              quantite: quantite?.toString(), // Total quantité
              prix_vente: Number(prixUnitaire), // Prix unitaire
              TVA: Number(TVA), // TVA
              ttc: ttc, // Total TTC
              tt: tt, // Total HT
              NBREU: NBREU,
              prixU: prixU,
            };
          })
          console.log("selectedPrdsData:", selectedPrdsData);

          for (const lignefactureData of selectedPrdsData) {
            // Vérifier si ligneDevis existe déjà et mettre à jour en conséquence
            if (lignefactureData.id) {
              // Si existe, mettre à jour la ligneDevis existante
              await axios.put(
                `http://localhost:8000/api/ligne_bon_commande/${lignefactureData.id}`,
                {
                  id: lignefactureData.id,
                  produit_id: lignefactureData.produit_id,
                  prix_vente: lignefactureData.prix_vente,
                  quantite: lignefactureData.quantite,
                  TVA: lignefactureData.TVA,
                  tt: lignefactureData.tt, // Ajouter TT dans la mise à jour
                  ttc: lignefactureData.ttc, // Ajouter TTC dans la mise à jour
                  id_BC: lignefactureData.id_BC,
                  NBREU: lignefactureData.NBREU,
                  prixU: lignefactureData.prixU,
                }
              );
            } else {
              await axios.post(
                "http://localhost:8000/api/ligne_bon_commande",
                {
                  produit_id: lignefactureData.produit_id,
                  prix_vente: lignefactureData.prix_vente,
                  quantite: lignefactureData.quantite,
                  id_BC: lignefactureData.id_BC,
                  TVA: lignefactureData.TVA,
                  tt: lignefactureData.tt, // Ajouter TT dans la création
                  ttc: lignefactureData.ttc, // Ajouter TTC dans la création
                  NBREU: lignefactureData.NBREU,
                  quantiteU: lignefactureData.quantiteU,
                  prixU: lignefactureData.prixU,
                }
              );
            }
          }





        } else {
          // Créer un nouveau Devis
          response = await axios.post(
            "http://localhost:8000/api/bons_commande",
            FactureData
          );
          //console.log(response.data.devi)
          const selectedPrdsData = selectedProductsData.map((selectProduct, index) => {
            // Initialisation des variables
            let TVA = 20; // Valeur par défaut
            let NBREU = null;
            let quantiteU = null;
            let prixU = null;
            let quantite = null;
            let prixUnitaire = null;
            let quantiteGet = null;
            let prixUnitairGet = null;
            let NBREUGet = null;
            let prixUGet = null;
            quantiteU = Number(selectProduct?.unite) || getElementValueById(`quantiteU_${index}_${selectProduct.produit_id}`);
            let ttc;
            let tt;
            // Récupération des données spécifiques selon le type_quantite
            if (selectProduct.type_quantite === 'unite') {

              TVA = getElementValueById(`TVA_${index}_${selectProduct.produit_id}`) || 20;

              NBREU = getElementValueById(`NBREU_${index}_${selectProduct.produit_id}`);
              quantiteU = Number(selectProduct?.unite) || getElementValueById(`quantiteU_${index}_${selectProduct.produit_id}`);

              prixU = getElementValueById(`PU_${index}_${selectProduct.produit_id}`);

              quantite = Number(NBREU) * Number(quantiteU);
              prixUnitaire = Number(prixU) / Number(quantiteU);

              ttc = Number(NBREU) * Number(prixU) * (1 + Number(TVA) / 100) // Total TTC
              tt = Number(NBREU) * Number(prixU)
            } else if (selectProduct.type_quantite === 'kg/unite') {
              TVA = getElementValueById(`TVA_${index}_${selectProduct.produit_id}`) || 20;

              NBREUGet = getElementValueById(`NBREU_${index}_${selectProduct.produit_id}`);
              quantiteU = Number(selectProduct?.unite) || getElementValueById(`quantiteU_${index}_${selectProduct.produit_id}`);

              prixUGet = getElementValueById(`PU_${index}_${selectProduct.produit_id}`);
              quantiteGet = getElementValueById(`quantite_${index}_${selectProduct.produit_id}`);
              prixUnitairGet = getElementValueById(`prix_unitaire_${index}_${selectProduct.produit_id}`);
              NBREU = NBREUGet ? NBREUGet : Number(quantiteGet) / Number(quantiteU)
              prixU = prixUGet ? prixUGet : Number(prixUnitairGet) * Number(quantiteU)
              quantite = quantiteGet ? quantiteGet : Number(NBREU) * Number(quantiteU);
              prixUnitaire = prixUnitairGet ? prixUnitairGet : Number(prixU) / Number(quantiteU);
              ttc = Number(quantite) * Number(prixUnitaire) * (1 + Number(TVA) / 100) // Total TTC
              tt = Number(quantite) * Number(prixUnitaire)
            } else {
              quantite = getElementValueById(`quantite_${index}_${selectProduct.produit_id}`);
              prixUnitaire = getElementValueById(`prix_unitaire_${index}_${selectProduct.produit_id}`);
              TVA = getElementValueById(`TVA_${index}_${selectProduct.produit_id}`) || 20;
              if (quantiteU) {
                NBREU = Number(quantite) / Number(quantiteU)
                prixU = Number(prixUnitaire) * Number(quantiteU)
              }
              ttc = Number(quantite) * Number(prixUnitaire) * (1 + Number(TVA) / 100) // Total TTC
              tt = Number(quantite) * Number(prixUnitaire)
            }

            // Retour de chaque ligne de facture
            return {
              id_BC: response.data.bonCommande.id,
              produit_id: selectProduct.produit_id,
              quantite: quantite?.toString(), // Total quantité
              prix_vente: Number(prixUnitaire), // Prix unitaire
              TVA: Number(TVA), // TVA
              ttc: ttc, // Total TTC
              tt: tt,
              NBREU, // Nombre d'unités
              quantiteU, // Quantité par unité
              prixU, // Prix par unité
            };
          })
          console.log("selectedPrdsData", selectedPrdsData);
          for (const lignefactureData of selectedPrdsData) {
            // Sinon, il s'agit d'une nouvelle ligne de Devis
            await axios.post(
              "http://localhost:8000/api/ligne_bon_commande",
              lignefactureData
            );
          }

        }
        console.log("response of postFACTURE: ", response.data);

        fetchFactures();

        setSelectedClient([]);

        setSelectedProductsData([])
        //fetchExistingLigneDevis();
        closeForm();
        Swal.close();

        // Afficher un message de succès à l'utilisateur
        Swal.fire({
          icon: "success",
          title: "Opération terminée avec succès",
          text: "Votre action a été réalisée avec succès.",
        });
      } catch (error) {
        Swal.close();

        console.error("Erreur lors de la soumission des données :", error);

        // Afficher un message d'erreur à l'utilisateur
        Swal.fire({
          icon: "error",
          title: "Échec de l'opération",
          text: "L'opération n'a pas pu être complétée. Veuillez réessayer plus tard.",
        });
      }
      setFormData({ // Clear form data
        raison_sociale: '',
        abreviation: '',
        adresse: '',
        tele: '',
        ville: '',
        zone_id: '',
        user_id: '',
        total_ttc: '',
        client_id: '',
        ice: '',
        dateLivraison: new Date().toISOString().split('T')[0],
        dateLivraisonSouhaitable: new Date().toISOString().split('T')[0],

        code_postal: '',
        Code_produit: "",
        designation: "",
        prix_vente: "",
        quantite: "",
        id_facture: "",
      });
      closeForm();
    }

  };


  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Êtes-vous sûr de vouloir supprimer ?",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Oui",
        denyButtonText: "Non",
        customClass: {
          actions: "my-actions",
          cancelButton: "order-1 right-gap",
          confirmButton: "order-2",
          denyButton: "order-3",
        },
      });

      if (result.isConfirmed) {
        // Delete the invoice with the given ID
        await axios.delete(`http://localhost:8000/api/bons_commande/${id}`);

        // Refresh the list of invoices (if necessary)
        fetchFactures(); // Ensure this function retrieves the list of invoices again after deletion
        deleteDataFromIndexedDB('bonCommandeAchat', id)

        Swal.fire({
          icon: "success",
          title: "Opération terminée avec succès",
          text: "Votre action a été réalisée avec succès.",
        });
      } else {
        console.log("Suppression annulée");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la bon commande:", error);

      Swal.fire({
        icon: "error",
        title: "Échec de l'opération",
        text: "L'opération n'a pas pu être complétée. Veuillez réessayer plus tard.",
      });
    }
  };


  const clearFormData = () => {
    // Reset the form data to empty values
    setFormData({
      reference: "",
      date: new Date().toISOString().split('T')[0],
      ref_BL: "",
      ref_BC: "",
      modePaiement: "",
      total_ttc: "",
      client_id: "",
      devis_id: "",
      id: "",
      dateLivraison: new Date().toISOString().split('T')[0],
      dateLivraisonSouhaitable: new Date().toISOString().split('T')[0],

    });
  };

  const handleEdit = (facture) => {
    console.log("facture for edit", facture);

    // Populate the form data with the details of the selected facture
    setEditingFacture(facture);

    setFormData({
      reference: facture.reference,
      date: facture.date,

      ref_BL: facture.ref_BL,
      ref_BC: facture.ref_BC,
      modePaiement: facture.modePaiement,
      total_ttc: facture.total_ttc,
      client_id: facture?.fournisseur?.id_mere ? facture.fournisseur.id_mere : facture.client_id,
      siteClient_id: facture?.fournisseur?.id_mere ? facture.client_id : undefined, dateLivraison: facture.dateLivraison ? facture.dateLivraison : new Date().toISOString().split('T')[0],
      dateLivraisonSouhaitable: facture.dateLivraisonSouhaitable ? facture.dateLivraisonSouhaitable : new Date().toISOString().split('T')[0],

      // user_id: facture.user_id, // No need to set user_id here as it's handled in handleSubmit
    });

    const selectedProducts = facture.
      ligne_bon_commande && facture.
        ligne_bon_commande.map((lignefacture) => {
          const product = produits.find((produit) => produit.id === lignefacture.produit_id);
          return {
            id: lignefacture.id,
            Code_produit: product.Code_produit,
            calibre_id: product?.calibre?.calibre,
            designation: product.designation,
            produit_id: lignefacture.produit_id,
            quantite: lignefacture.quantite,
            prix_vente: lignefacture.prix_vente,
            TVA: lignefacture.TVA, // TVA should be taken from ligne_facture
            NBREU: lignefacture.NBREU,
            quantiteU: lignefacture.quantiteU,
            prixU: lignefacture.prixU,
            unite: product?.unite,
            type_quantite: product?.type_quantite,
          };
        });

    setSelectedProductsData(selectedProducts);
    console.log("selectedProducts for edit", selectedProducts);

    if (formContainerStyle.right === "-100%") {
      setFormContainerStyle({ right: "0" });
      setTableContainerStyle({ width: '40.5%' });
    }
  };

  const closeForm = () => {
    setFormData({ // Clear form data
      reference: "",
      dateLivraison: new Date().toISOString().split('T')[0],
      dateLivraisonSouhaitable: new Date().toISOString().split('T')[0],

      date: new Date().toISOString().split('T')[0],
      ref_BL: "",
      ref_BC: "",
      modePaiement: "",
      total_ttc: "",
      client_id: "",
      dateLivraison: new Date().toISOString().split('T')[0],
    });
    setFormContainerStyle({ right: '-100%' });
    setTableContainerStyle({ width: '100% ' });
    setShowForm(false); // Hide the form
    setErrors({})
    setModifiedNBREUValues({})
    setModifiedPUValues({})
    setModifiedPrixValues({})
    setModifiedQuantiteValues({})
    setEditingFacture(null); // Clear editing client
    setSelectedProductsData([])
  };

  const handleShowFormButtonClick = () => {

    if (formContainerStyle.right === "-100%") {
      setFormContainerStyle({ right: "-0%" });
      setTableContainerStyle({ width: '40.5%' });
    } else {
      closeForm();
    }
  };
  function numberToWords(number) {
    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];
    const hundreds = ["", "cent", "deux cent", "trois cent", "quatre cent", "cinq cent", "six cent", "sept cent", "huit cent", "neuf cent"];
    const thousands = "mille";

    // Handle zero case
    if (number === 0) return "zéro";

    let words = "";

    // Handle thousands
    if (number >= 1000) {
      let thousandPart = Math.floor(number / 1000);
      if (thousandPart === 1) {
        words += thousands + " ";
      } else {
        words += numberToWords(thousandPart) + " " + thousands + " ";
      }
      number %= 1000;
    }

    // Handle hundreds
    if (number >= 100) {
      let hundredPart = Math.floor(number / 100);
      if (hundredPart > 1) {
        words += hundreds[hundredPart] + " ";
      } else {
        words += hundreds[hundredPart]; // "cent" without the trailing space
      }
      number %= 100;
    }

    // Handle tens (if between 10 and 19, handle them separately)
    if (number >= 10 && number <= 19) {
      const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
      words += teens[number - 10] + " ";
      return words.trim();  // Return here for teens (10-19)
    }

    if (number >= 20) {
      let tenPart = Math.floor(number / 10);
      words += tens[tenPart] + " ";
      number %= 10;
    }

    // Handle units
    if (number > 0) {
      words += units[number] + " ";
    }

    return words.trim();
  }


  const handlePDF = (devisId, handelV) => {
    // Récupérer les informations spécifiques au devis sélectionné
    const selectedDevis = factures.find((devis) => devis.id === devisId);
    console.log('selectedDevis', selectedDevis)
    if (!selectedDevis) {
      console.error(`Devis avec l'ID '${devisId}' introuvable.`);
      return;
    }

    // Création d'une nouvelle instance de jsPDF
    const doc = new jsPDF();

    // Ajouter une image de fond
    const logoPath1 = "./../../public/images/logo-ovotec-08 (1).png"; // Chemin vers le premier logo
    const logoPath2 = "./../../public/images/logo-ovotec-08 (1).png"; // Chemin vers le deuxième logo

    // Ajouter les logos
    const logoWidth = 50; // Largeur des logos
    const logoHeight = 20; // Hauteur des logos
    const margin = 10; // Marge par rapport au bord
    const spaceBetweenLogos = 20; // Espace entre les logos

    // Ajouter le premier logo
    doc.addImage(logoPath1, "PNG", margin, margin, logoWidth, logoHeight);

    // Ajouter le deuxième logo (à droite)
    doc.addImage(
      logoPath2,
      "PNG",
      doc.internal.pageSize.width - margin - logoWidth,
      margin,
      logoWidth,
      logoHeight
    );

    let separatorY = logoHeight + margin + spaceBetweenLogos;

    // }

    // Dessiner un cadre noir pour les informations du client
    const boxX = 120; // Ajustez la position horizontale du cadre
    const boxY = separatorY + 10;
    const boxWidth = 80; // Ajustez la largeur du cadre
    const boxHeight = 40; // Ajustez la hauteur du cadre

    // Définir les deux groupes d'informations
    const leftClientInfo = [
      { label: "BC N°:", value: selectedDevis.reference },
      { label: "Date:", value: selectedDevis.date },
      { label: "BL:", value: selectedDevis.ref_BL },
      { label: "BC:", value: selectedDevis.ref_BC },
    ];

    const rightClientInfo = [
      { label: "Nom:", value: selectedDevis.fournisseur?.raison_sociale },
      { label: "Adresse:", value: selectedDevis.fournisseur?.adresse },
      { label: "Téléphone:", value: selectedDevis.fournisseur?.tele },
      { label: "ICE:", value: selectedDevis.fournisseur?.ice },
    ];

    const pageWidth = doc.internal.pageSize.width;
    const leftColumnX = 13;
    const rightColumnX = pageWidth / 2;

    let offsetY = separatorY + 10;

    doc.setFontSize(10);

    leftClientInfo.forEach((info, index) => {
      if (index === 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
      }
      doc.text(`${info.label} ${info.value || ""}`, leftColumnX, offsetY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      offsetY += 6;
    });

    offsetY = separatorY + 10;
    const maxWidth = (pageWidth - rightColumnX) - margin; // Largeur maximale pour la colonne droite

    rightClientInfo.forEach((info, index) => {
      let lines = doc.splitTextToSize(`${info.label} ${info.value || ""}`, maxWidth); // Découper le texte s'il est trop long

      if (index === 0) {
        // Nom en gras avec une police plus grande
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
      }

      // Afficher chaque ligne
      lines.forEach((line) => {
        doc.text(line, rightColumnX, offsetY); // Afficher la ligne à la position actuelle
        offsetY += 6; // Ajouter un espacement entre les lignes
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    });







    // Vérifier si les détails des lignes de devis sont définis
    let totalHT = 0;
    let totalTTC = 0;

    const headersLigneDevis = ["Produit", "Code produit", "Désignation", "Quantité", "Prix Unitaire", "Total"];

    const rowsLigneDevis = selectedDevis.ligne_bon_commande.map((ligne, idx) => {
      const produit = produits.find(prod => prod.id === ligne.produit_id);
      const totalLigne = (ligne.quantite * ligne.prix_vente) || 0;
      totalHT += totalLigne;
      totalTTC += totalLigne * 1.2; // Assuming 20% VAT

      return [
        idx + 1, // Adding index for row number
        produit ? produit.Code_produit : "",
        produit ? produit.designation : "",
        ligne.quantite || "",
        ligne.prix_vente || "0.0",
        totalLigne.toFixed(2) || "0.0"
      ];
    });

    // Add the table with data
    doc.autoTable({
      head: [headersLigneDevis],
      body: rowsLigneDevis,
      startY: boxY + boxHeight + 10,
      margin: { top: 20 },
      tableWidth: 'auto',
      styles: {
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 'auto' },
      },
    });

    // Add totals rows (MONTANT TOTAL HORS TAXES, TVA, and MONTANT TOTAL TOUTES TAXES COMPRISE)
    doc.autoTable({
      body: [
        [
          { content: 'MONTANT TOTAL HORS TAXES', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
          totalHT.toFixed(2) + " DH",
        ],
        [
          { content: 'TVA 20%', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
          (totalTTC - totalHT).toFixed(2) + " DH",
        ],
        [
          { content: 'MONTANT TOTAL TOUTES TAXES COMPRISE', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
          totalTTC.toFixed(2) + " DH",
        ]
      ],
      startY: doc.autoTable.previous.finalY + 0,
      styles: {
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: '70%' },  // Label column takes up 70% of the width
        1: { cellWidth: '30%' },  // Value column takes up 30% of the width
      },
    });



    // Ajouter la table des informations supplémentaires


    // Ajouter une ligne séparatrice pour les informations de la société en bas de la page
    const companyInfoY = doc.internal.pageSize.height - 25; // Position verticale pour les informations de la société
    // Define font size and style for the footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Footer Left (50% of the page width)
    // let companyInfoY = doc.autoTable.previous.finalY + 10; // Adjust vertical position
    let leftX = 15; // Start 15px from the left edge of the page
    let rightX = doc.internal.pageSize.width / 1.3; // Start 15px from the middle of the page (50% width)

    // Left Footer Information
    doc.text("SIÈGE : 131 Bd d'Anfa Résidence Azur bureau N° 11 B Casablanca", leftX, companyInfoY);
    doc.text("OVOTEC Zone Industrielle Sapino lot. N°940 Nouaceur 20240 Casablanca", leftX, companyInfoY + 5);
    doc.text("Fixe: 05 22 53 70 96/98 - E-mail: contact@ovotec.ma - Site: www.ovotec.ma", leftX, companyInfoY + 10);
    doc.text("N° de compte BMCI Casa EMILLE ZOLA: 01140 001732 001 19", leftX, companyInfoY + 15);

    // Right Footer Information
    doc.text("IF : 14437568", rightX, companyInfoY);
    doc.text("Patente : 35546700", rightX, companyInfoY + 5);
    doc.text("CNSS : 9574080", rightX, companyInfoY + 10);
    doc.text("RC : 282493", rightX, companyInfoY + 15);
    doc.text("ICE : 000082990000018", rightX, companyInfoY + 20);


    // Ajouter les sections de signature


    // Enregistrer le fichier PDF avec le nom 'devis.pdf'
    doc.save("Facture.pdf");
  };

  function formatTotalTTC(totalTTC) {
    const totalInWords = numberToWords(Math.floor(totalTTC)); // Only works with integer part
    const decimalPart = (totalTTC % 1).toFixed(2).split('.')[1];

    return `${totalInWords.toUpperCase()} DIRHAMS TTC `;
  }
  const print = (devisId, handelV) => {
    const selectedDevis = factures.find((devis) => devis.id === devisId);

    if (!selectedDevis) {
      console.error(`Devis avec l'ID '${devisId}' introuvable.`);
      return;
    }

    let totalHT = 0;
    let totalTTC = 0;
    let quantite = false
    let unite = false
    selectedDevis.ligne_bon_commande?.forEach((lignefacture) => {
      totalHT += Number(lignefacture.tt);
      totalTTC += Number(lignefacture.ttc);

      if ((lignefacture?.produit.type_quantite === 'kg' || lignefacture?.produit.type_quantite === 'Litre' || lignefacture?.produit.type_quantite === 'M')) {
        quantite = true;
      } else if ((lignefacture?.produit.type_quantite === 'unite')) {
        unite = true
      } else if (lignefacture?.produit.type_quantite === 'kg/unite') {
        unite = true
        quantite = true;

      }
    });

    const printWindow = window.open("", "", "");
    const companyNameSection = handelV ? `
       <div class="company-info">
                                   <img src="./../../public/images/ovotec_logo.jpg" alt="Logo de l'entreprise" style="margin-top:0px width: 120px; height: 120px; ">
  
                        </div>
  <div class="img-info" style="display: flex; align-items: center; margin-top: -20px; margin-bottom: -70px;">
    <img src="./../../public/images/Logo-certification-02.png" alt="Logo de l'entreprise" style="width: 50px; height: 50px; ">
    <img src="./../../public/images/fssc-22000-logo-2020.png" alt="Logo de l'entreprise" style="width: 100px; height: 100px;  margin-left: 10px;">
  </div>



    ` : '';
    if (printWindow) {
      const newWindowDocument = printWindow.document;

      newWindowDocument.write(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0px;
                        }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0px;
  }
  
  .header .company-info,
  .header .client-info {
    text-align: left; /* Alignement à gauche */
    width: 35%;
  }
    .client-info {
    border: 2px solid black; /* Bordure grise */
    border-radius: 10px; /* Coins arrondis */
    padding: 15px; /* Espace intérieur */
    margin: 10px 0; /* Espace extérieur (haut et bas) */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Ombre légère */
    background-color: #f9f9f9; /* Fond légèrement gris */
}
.client-info h4, 
.client-info h5, 
.client-info p {
    margin: 5px 0; /* Espacement entre les éléments */
      	font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace; 

}
  .header .company-info h4,
  .header .client-info h4 {
    margin-bottom: 5px; /* Supprimer les marges */
          	font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace; 

  }
  .header .company-info h5,
  .header .client-info h5 {
  margin:0;
      	font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace; 
  }
  
  .header .company-info p,
  .header .client-info p {
    margin: 0;
    padding: 0;
    line-height: 1.8;
    font-size: 14px;
          	font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace; 

  }
  
  /* Style pour le bloc facture */
  .invoice-details {
    text-align: right; /* Aligner à droite */
    width: 30%;
  }
  
  .invoice-details h4 {
    margin: 0;
    font-size: 18px;
  }
  
  .invoice-details p {
    margin: 5px 0; /* Espacement entre numéro de facture et date */
    font-size: 14px;
  }
  
  
  .espace{
  height: 20px
  }
  
  .table1{
                            margin-top: 10px;
  
  }
  
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                            border-right: 1px solid black;
                            border: 2px solid black;

                        }
                        th, td {
                        border-right: 2px solid black;
                        border: 2px solid black;

    padding: 8px;  /* Réduction du padding */
    text-align: center;
    vertical-align: middle;
    font-size: 11px; /* Réduction de la taille de la police dans les cellules */
  }
  td{
  	font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace; 
    font-size: 12px; /* Réduction de la taille de la police dans les cellules */
 color:black;
  font-weight: bold;
   }
                        .totals {
                            margin-top: 20px;
                            text-align: right;
                            font-size: 16px;
                        }
                        .totals .total-label {
                            font-weight: bold;
                        }
                        .signature {
                            margin-top: 50px;
                            display: flex;
                            justify-content: space-between;
                        }
                        .signature div {
                            width: 45%;
                            text-align: center;
                            border-top: 1px solid #000;
                            padding-top: 10px;
                        }
  .logo-container {
    width: 200px; /* Taille fixe pour garantir un carré */
    height: 120px; /* Taille fixe pour garantir un carré */
    display: flex;
    align-items: center;
    justify-content: center;
        text-align: left; /* Alignement à gauche pour les deux sections */
        width: 35%;
  }
  
  .footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 12px;
  text-align: left;
  border-top: 1px solid #000;
  background: #fff;
  padding: 0px 0px;
  display: flex;
  justify-content: space-between;
  }
  
  .footer-right {
  width: 30%; /* Assure un bon espacement entre les colonnes */
  line-height: 0.5;
  }
  .footer-left {
  width: 64%; /* Assure un bon espacement entre les colonnes */
  line-height: 0.5;
  }
  .footer-right {
  text-align: right; /* Aligne les informations de la partie droite */
  }
  .table-no-border-lines tr {
  border: none; /* Supprime les bordures de chaque ligne */
}



.divide td {
    border-top: none; /* Supprime la bordure du haut */
  border-bottom: none; /* Supprime la bordure du bas */
  border-left: 2px solid black; /* Définit la bordure gauche */
  border-right: 2px solid black; /* Définit la bordure droite */
  height: 20px;

}

  divide th{
    border-top: 2px solid black; /* Supprime la bordure du haut */
  border-bottom: 2px solid black; /* Supprime la bordure du bas */
  border-left: 2px solid black; /* Définit la bordure gauche */
  border-right: 2px solid black; /* Définit la bordure droite */
  }
  .des{
  width:40%;
  }

                    </style>
                </head>
                <body>
 <div class="header">

                             ${companyNameSection}

                    </div>
                    <div class="header">

                        <div class="company-info">
                            <h4>COMMANDE N°: <span style="margin-left: 20px;">${selectedDevis.reference} </span></h4>
                            <h5>Date: ${new Date(selectedDevis.date).toLocaleDateString('fr-FR') || ''}</h5>
                        </div  class="espace">
                        <div class="client-info">
                            <h4>${selectedDevis.fournisseur?.raison_sociale || ''}</h4>
                            ${selectedDevis.fournisseur?.ice ? ` <h5>ICE:  <span style="margin-left: 20px;">${selectedDevis.fournisseur?.ice || ''}</span></h5>` : ''
        }
                          ${selectedDevis.fournisseur?.adresse ? ` <h5>Adresse: <span style="margin-left: 20px;"> ${selectedDevis.fournisseur?.adresse || ''}</span></h5>
`: ''
        }
                        </div>
                    </div>
                
                   <table  class="table1  xaclassName="w-full border border-black">
                        <thead>
                                                     <tr>
                              <th>Référence</th>
                              <th>Désignation</th>

${unite
          ? `
            <th>Unité </th>
            <th>P.U/Unité</th>
          `
          : `
            
          `
        }
                                    ${quantite
          ? `
            <th>Quantité</th>
            <th>Prix </th>
          `
          : `
            
          `
        }
                              
                              <th>Total </th>

                          </tr>
                        </thead>
                        <tbody>
                            ${selectedDevis.ligne_bon_commande
          .map((ligne, idx) => {
            const produit = produits.find(prod => prod.id === ligne.produit_id);
            return `
                                        <tr  class="divide">
      <td>${produit ? produit.Code_produit : ''}</td>
      <td>${produit ? produit.designation : ''}</td>
      ${unite
                ? `
               <td>${ligne?.NBREU ? Number(ligne?.NBREU).toLocaleString('fr-FR') : ''}</td>
        <td>${ligne?.prixU ? Number(ligne?.prixU).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : ''}</td>
          `
                : `
            
          `
              }
      ${quantite ? `
        <td>${ligne?.quantite ? Number(ligne?.quantite).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : ''}</td>
        <td>${ligne?.prix_vente ? Number(ligne?.prix_vente).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : ''}</td>
          `
                : `
          
        `
              }
  <td>${ligne?.tt ? Number(ligne?.tt).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : ''}</td>

    </tr>
                                    `;
          })
          .join("")
        +
        Array.from(
          { length: Math.max(0, 11 - selectedDevis.ligne_bon_commande.length) },
          (_, i) => `
          <tr class="divide">
            <td ></td>
            <td ></td>
            ${unite ? `<td></td><td></td>` : ''}
            ${quantite ? `<td></td><td></td>` : ''}
            <td></td>
          </tr>
        `
        ).join('')}
                        </tbody>
                    </table>

  <div style="text-align: left; font-size: 12px; margin-top: 10px; font-family: Arial, sans-serif; margin-bottom: 10px;">
<p style="margin: 0; display: inline-block; border-bottom: 1px solid #ddd;">
  Arrêtée la présente facture à la somme de:
</p>

  <br />
  <h5 style="margin: 0; margin-top: 5px; display: block; display: inline-block;     	font-family: Courier New,Courier,Lucida Sans Typewriter,Lucida Typewriter,monospace; 
">
    ${formatTotalTTC(totalTTC)} <!-- Exemple pour illustrer une réduction -->
  </p>
</div>
 <div style="display: flex; justify-content: flex-end; margin-top: -20px;">
    <table border="1" style="width: 35%; margin-left: auto;">
      <tr>
      <td colSpan="2" class="ColoretableForm" style="text-align: right;">
  <span style="float: left;  font-weight: bold;">Total H.T. </span>
</td>
          <td colSpan="2">${(totalHT || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>

      </tr>
      <tr>
      <td colSpan="2" class="ColoretableForm" style="text-align: right; ">
  <span style="float: left;  font-weight: bold;">Total TVA:</span>
</td>
      <td colSpan="2">${(totalTTC - totalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) || ''} </td>

      </tr>
      <tr>
<td colSpan="2" class="ColoretableForm" style="text-align: right; ">
  <span style="float: left; font-weight: bold;">Total TTC :</span>
</td>
      <td colSpan="2">${totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) || ''} </td>

      </tr>

    </table>
  </div>
  
                 <div class="footer">
  <div class="footer-left">
    <p>SIÈGE : 131 Bd d'Anfa Résidence Azur bureau N° 11 B Casablanca</p>
    <p>OVOTEC Zone Industrielle Sapino lot. N°940 Nouaceur 20240 Casablanca</p>
    <p>Fixe: 05 22 53 70 96/98 - E-mail: contact@ovotec.ma - Site: www.ovotec.ma</p>
    <p>N° de compte BMCI Casa EMILLE ZOLA: 01140 001732 001 19</p>
  </div>
  <div class="footer-right">
    <p>IF : 14437568</p>
    <p>Patente : 35546700</p>
    <p>CNSS : 9574080</p>
    <p>RC : 282493</p>
    <p>ICE : 000082990000018</p>
  </div>
</div>

                </body>
                </html>
                `);


      newWindowDocument.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };


  function nombreEnLettres(nombre) {
    const units = ['', 'un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
    const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-Sept', 'Dix-Huit', 'Dix-Neuf'];
    const tens = ['', 'Dix', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-Dix', 'Quatre-Vingt', 'Quatre-Vingt-Dix'];

    let parts = [];

    if (nombre === 0) {
      return 'zéro';
    }

    if (nombre >= 1000) {
      parts.push(nombreEnLettres(Math.floor(nombre / 1000)) + ' Mille');
      nombre %= 1000;
    }

    if (nombre >= 100) {
      parts.push(units[Math.floor(nombre / 100)] + ' Cent');
      nombre %= 100;
    }

    if (nombre >= 10 && nombre <= 19) {
      parts.push(teens[nombre - 10]);
      nombre = 0;
    } else if (nombre >= 20 || nombre === 10) {
      parts.push(tens[Math.floor(nombre / 10)]);
      nombre %= 10;
    }

    if (nombre > 0) {
      parts.push(units[nombre]);
    }

    return parts.join(' ');
  }

  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filtrer les factures par type 'C'



  const validateForm = () => {
    const newErrors = {};

    // Validate N Facture




    // Validate produits
    if (selectedProductsData?.length === 0) {
      newErrors.products = 'Au moins un produit doit être sélectionné.';
    } else {
      const productErrors = [];
      selectedProductsData.forEach((productData, index) => {
        let rowErrors = '';

        if (!productData?.produit_id
        ) {
          newErrors[`Produit_id_${index}`] = `Produit ${index + 1}: Le Code produit est obligatoire.`;
        }




        if (rowErrors) {
          productErrors.push(rowErrors.trim());
        }
      });

      // Combine all product errors or leave `newErrors.products` undefined if empty
      if (productErrors.length > 0) {
        newErrors.products = productErrors;
      }
    }

    setErrors(newErrors);

    // Return true if no errors
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChangeSelect = (index, field, value) => {
    const updatedProducts = [...selectedProductsData];
    updatedProducts[index][field] = value;



    setSelectedProductsData(updatedProducts);

  };
  console.log('factur', factures)
  console.log('slect', selectedProductsData)

  // Filtrer les clients en fonction de la saisie


  // Mettre à jour le terme de recherche lorsque l'utilisateur change la sélection
  const handleSelectChange = (event) => {
    handleChange(event);
    setSearchTerm(''); // Réinitialiser le champ de recherche après sélection
  };
  function generateUniqueReferenceFa() {
    const date = new Date();

    // Récupérer les deux derniers chiffres de l'année
    const year = date.getFullYear().toString().slice(-2);

    // Charger le compteur depuis localStorage, ou initialiser à 1
    let counter = localStorage.getItem("uniqueCounterFACTUREACHAT");
    counter = counter ? parseInt(counter) + 1 : 1;

    // Sauvegarder le compteur incrémenté
    localStorage.setItem("uniqueCounterFACTUREACHAT", counter);

    // Format du compteur avec des zéros en tête
    const formattedCounter = String(counter).padStart(5, "0");

    return `${year}/${formattedCounter}`;
  }
  const handleGenerateFacture = async (devis) => {
    console.log('devis', devis)
    try {
      Swal.fire({
        title: 'Traitement en cours...',
        text: 'Veuillez patienter pendant le traitement de votre demande',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      // 1. Préparer les données de la facture
      const factureData = {
        reference: '',
        client_id: devis.client_id,
        modePaiement: devis.modePaiement,
        user_id: user.id,
        type: 'F',
        date: new Date().toISOString().split('T')[0], // Adding current date
        ref_BL: devis.ref_BL,
        ref_BC: devis.reference,
        ligneFactures: devis.ligne_bon_commande
          .map(
            (ligneDevis) => ({

              produit_id: ligneDevis.produit_id,
              quantite: ligneDevis.quantite,
              prix_vente: ligneDevis.prix_vente,
              tt: ligneDevis.tt,
              ttc: ligneDevis.ttc,
              TVA: ligneDevis.TVA,
              NBREU: ligneDevis.NBREU,
              quantiteU: ligneDevis.quantiteU,
              prixU: ligneDevis.prixU,


            })
          )
      };
      console.log('devis', devis)
      // 2. Envoyer une requête POST pour créer la facture
      const factureResponse = await axios.post(
        "http://localhost:8000/api/factures",
        factureData
      );
      console.log("factureResponse", factureResponse);






      const response = await axios.post('http://localhost:8000/api/numbreG',
        {
          idG: devis.id,
          type: 'FABCG'
        });
      Swal.close();
      fetchFactures()
      // Afficher un message de succès à l'utilisateur
      Swal.fire({
        icon: "success",
        title: "Opération terminée avec succès",
        text: "Votre action a été réalisée avec succès.",
      });
    } catch (error) {
      Swal.close();

      console.error("Erreur lors de la génération de Facture :", error);

      // Afficher un message d'erreur à l'utilisateur
      Swal.fire({
        icon: "error",
        title: "Échec de l'opération",
        text: "L'opération n'a pas pu être complétée. Veuillez réessayer plus tard.",
      });
    }
  };
  function generateUniqueReferenceBl() {
    const date = new Date();

    // Récupérer les deux derniers chiffres de l'année
    const year = date.getFullYear().toString().slice(-2);

    // Charger le compteur depuis localStorage, ou initialiser à 1
    let counter = localStorage.getItem("uniqueCounterBLACHAT");
    counter = counter ? parseInt(counter) + 1 : 1;

    // Sauvegarder le compteur incrémenté
    localStorage.setItem("uniqueCounterBLACHAT", counter);

    // Format du compteur avec des zéros en tête
    const formattedCounter = String(counter).padStart(5, "0");

    return `${year}/${formattedCounter}`;
  }
  const handleGenerateBonLivraison = async (DevisData) => {
    console.log('devis', DevisData)
    Swal.fire({
      title: 'Traitement en cours...',
      text: 'Veuillez patienter pendant le traitement de votre demande',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    try {
      // Préparer les données du bon de livraison
      const bonLivraisonData = {
        reference: '',
        date: DevisData.date,

        validation_offer: DevisData.validation_offer,
        modePaiement: DevisData.modePaiement,
        status: DevisData.status,
        client_id: DevisData.client_id,
        user_id: user.id,
        ref_BL: DevisData.reference,

        type: 'F'

      };
      console.log('bonLivraisonData', bonLivraisonData)

      // Envoyer une requête POST pour créer le bon de livraison
      const bonLivraisonResponse = await axios.post(
        "http://localhost:8000/api/livraisons",
        {
          reference: '',
          date: DevisData.date,

          validation_offer: DevisData?.validation_offer,
          modePaiement: DevisData?.modePaiement,
          status: DevisData?.status,
          client_id: DevisData.client_id,
          user_id: user.id,
          ref_BL: DevisData.reference,

          type: 'F'
        }
      );

      const livraison = bonLivraisonResponse.data;



      // 3. Récupérer les lignes de devis associées au devis




      console.log("livraison", livraison)



      const lignesbonLivraisonData = DevisData.ligne_bon_commande
        .map((ligneDevis) => ({
          id_bon_Livraison: livraison.devis.id.toString(),
          produit_id: ligneDevis.produit_id,
          prix_vente: ligneDevis.prix_vente,
          quantite: ligneDevis.quantite,
          TVA: ligneDevis.TVA,
          tt: ligneDevis.tt, // Ajouter TT dans la mise à jour
          ttc: ligneDevis.ttc, // Ajouter TTC dans la mise à jour
          id_facture: ligneDevis.id_facture,
          NBREU: ligneDevis.NBREU,
          quantiteU: ligneDevis.quantiteU,
          prixU: ligneDevis.prixU,
        }));

      console.log("livraison1", lignesbonLivraisonData);
      for (const lignebonLivraisonData of lignesbonLivraisonData) {
        // Sinon, il s'agit d'une nouvelle ligne de Devis
        await axios.post(
          "http://localhost:8000/api/lignelivraisons",
          lignebonLivraisonData
        );
      }
      const response = await axios.post('http://localhost:8000/api/numbreG',
        {
          idG: DevisData.id,
          type: 'BLABCG'
        });
      console.log(response)
      fetchFactures()
      Swal.fire({
        icon: "success",
        title: "Échec de l'opération",
        text: "L'opération n'a pas pu être complétée. Veuillez réessayer plus tard.",
      });

    } catch (error) {
      Swal.close();

      console.error("Erreur lors de la génération de la BL :", error);
    }
  };

  const handleProductSelection = (selectedProduct, index) => {
    console.log("selectedProduct", selectedProduct);
    const updatedSelectedProductsData = [...selectedProductsData];
    updatedSelectedProductsData[index] = selectedProduct;
    setSelectedProductsData(updatedSelectedProductsData);
    console.log("selectedProductsData", selectedProductsData);
  };




  const [selectedFactures, setSelectedFactures] = useState([]); // Liste des factures sélectionnées

  // Fonction pour gérer la sélection des factures
  const handleSelectFacture = (factureId) => {
    if (selectedFactures.includes(factureId)) {
      setSelectedFactures(selectedFactures.filter(id => id !== factureId));
    } else {
      setSelectedFactures([...selectedFactures, factureId]);
    }
  };

  // Delete the invoice with the given ID
  const handleDeleteSelectedFactures = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Êtes-vous sûr de vouloir supprimer ?",
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: "Oui",
        denyButtonText: "Non",
        customClass: {
          actions: "my-actions",
          cancelButton: "order-1 right-gap",
          confirmButton: "order-2",
          denyButton: "order-3",
        },
      });

      if (result.isConfirmed) {
        // Delete the invoice with the given ID
        for (const id of selectedFactures) {
          await axios.delete(`http://localhost:8000/api/bons_commande/${id}`);
          await deleteDataFromIndexedDB('bonCommandeAchat', id);

        }
        // Refresh the list of invoices (if necessary)
        fetchFactures(); // Ensure this function retrieves the list of invoices again after deletion
        setSelectedFactures([])
        Swal.fire({
          icon: "success",
          title: "Opération terminée avec succès",
          text: "Votre action a été réalisée avec succès.",
        });
      } else {
        console.log("Suppression annulée");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la bon commande:", error);

      Swal.fire({
        icon: "error",
        title: "Échec de l'opération",
        text: "L'opération n'a pas pu être complétée. Veuillez réessayer plus tard.",
      });
    }
  };

  const handleGenerateCombinedFacture = () => {
    const reference = generateUniqueReferenceFa().replace("/", "");

    const selectedFacturesData = produitsFiltres.filter(facture => selectedFactures.includes(facture.id));

    if (selectedFacturesData.length > 0) {
      // Récupérer les ID des fournisseurs
      const fournisseurIds = selectedFacturesData.map(facture => facture.client_id);
      // Vérifier si tous les fournisseurs sont les mêmes
      const uniqueFournisseurs = new Set(fournisseurIds);

      if (uniqueFournisseurs.size > 1) {
        // Si plusieurs fournisseurs sont trouvés




        Swal.fire({
          icon: "error",
          title: "Fournisseur différents détectés",
          text: "Les bons de commande sélectionnés ne proviennent pas du même Fournisseur. Veuillez vérifier.",
        });
        return; // Sortir de la fonction
      }
    }

    if (selectedFacturesData.length > 0) {
      Swal.fire({
        title: 'Traitement en cours...',
        text: 'Veuillez patienter pendant le traitement de votre demande',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      const fournisseur = selectedFacturesData[0].client_id;
      console.log('fournisseur', fournisseur, selectedFacturesData)
      const lignesFactures = selectedFacturesData.flatMap(facture => facture.ligne_bon_commande);
      console.log('fournisseur', fournisseur, selectedFacturesData, lignesFactures)
      const refBlList = selectedFacturesData.map(facture => facture.ref_BL).filter(ref => ref);
      const refBcList = selectedFacturesData.map(facture => facture.ref_BC).filter(ref => ref);

      // Concaténer les références avec des virgules
      const refsBl = refBlList.join(', ');
      const refsBc = refBcList.join(', ');

      console.log('Références BL:', refsBl);
      console.log('Références BC:', refsBc);
      const newFacture = {
        reference: reference.replace("/", ""),
        ref_BL: refsBl,
        ref_BC: refsBc,
        client_id: fournisseur,
        type: 'F',

        lignes_facture: lignesFactures,
        date: new Date().toISOString().split('T')[0], // Date actuelle

      };

      // Appel à l'API pour créer une nouvelle facture
      axios.post("http://localhost:8000/api/bc-combinee", newFacture)
        .then(() => {
          fetchFactures(); // Recharger les factures après création
          Swal.close();
          Swal.fire({
            icon: "success",
            title: "Échec de l'opération",
            text: "L'opération n'a pas pu être complétée. Veuillez réessayer plus tard.",
          });
          setSelectedFactures([])
        })
        .catch(error => {
          console.error(error);
          Swal.fire("Erreur lors de la génération", "", "error");
        });

    }
  };
  const updateClientFields = (client) => {
    if (client) {
      setFormData((prevData) => ({
        ...prevData,
        client_id: client.id,
        CodeFournisseur: client.CodeFournisseur,
        raison_sociale: client.raison_sociale,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        client_id: '',
        CodeFournisseur: '',
        raison_sociale: '',
        siteClient_id: '',

      }));
    }
  };
  const updateClientFieldsSite = (client) => {
    if (client) {
      setFormData((prevData) => ({
        ...prevData,
        siteClient_id: client.id,
        CodeFournisseur: client.CodeFournisseur,
        raison_sociale: client.raison_sociale,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        siteClient_id: '',
        CodeFournisseur: '',
        raison_sociale: '',
      }));
    }
  };

  const handleDateChange = (event) => {
    setFilterDate(event.target.value);
  };

  const handleDateChangefin = (event) => {
    setFilterDatefin(event.target.value);
  };

  const [datepardefault, setDatepardefault] = useState()
  const [dataFiltre, setDataFiltre] = useState(filteredfactures.filter((item) => new Date(item.date) === datepardefault));


  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    setDatepardefault(currentDate);
  }, []);
  const [filterDate, setFilterDate] = useState(datepardefault);
  const [filterDatefin, setFilterDatefin] = useState(datepardefault);


  useEffect(() => {
    const filteredData = filteredfactures.filter(item => {
      const itemDate = new Date(item.date);
      const start = filterDate ? new Date(filterDate) : null;
      const end = filterDatefin ? new Date(filterDatefin) : null;


      if (start && end) {
        return itemDate >= start && itemDate <= end;
      } else if (start) {
        return itemDate >= start;
      } else if (end) {
        return itemDate <= end;
      } else {
        return true;
      }
    });
    setDataFiltre(filteredData);

  }, [filterDate, filterDatefin, filteredfactures]);


  const filteredFactures = dataFiltre.filter((facture) => facture.type === 'F');

  const [clientFiltre, setClientFiltre] = useState("");
  const [statusFiltre, setStatusFiltre] = useState("");
  const [SiteClientFiltre, setSiteClientFiltre] = useState([]);
  console.log('dataFiltre', dataFiltre)
  // Fonction pour filtrer les produits
  const produitsFiltres = dataFiltre.filter((facture) =>
    ((clientFiltre ? Number(facture.client_id) === Number(clientFiltre) : true) ||
      (clientFiltre ? Number(facture?.fournisseur?.id_mere) === Number(clientFiltre) : true)) &&

    (statusFiltre ? facture.status === statusFiltre : true) &&
    (SiteClientFiltre.length > 0
      ? SiteClientFiltre.some((id) => id === Number(facture.client_id))
      : true)
  );
  // Pagination
  const indexOfLastFacture = (page + 1) * rowsPerPage;
  const indexOfFirstFacture = indexOfLastFacture - rowsPerPage;
  const currentFactures = produitsFiltres.slice(indexOfFirstFacture, indexOfLastFacture);

  const handleChangeRowsPerPage = (event) => {
    const selectedRows = parseInt(event.target.value, 10);
    setRowsPerPage(selectedRows);
    localStorage.setItem('rowsPerPageBCA', selectedRows);  // Store in localStorage
    setPage(1);
  };

  useEffect(() => {
    const savedRowsPerPage = localStorage.getItem('rowsPerPageBCA');
    if (savedRowsPerPage) {
      setRowsPerPage(parseInt(savedRowsPerPage, 10));
    }
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const [showFilters, setShowFilters] = useState(false);

  const [animation, setAnimation] = useState('');

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const tableColumn = [
      "N° Bon commande",
      "Fournisseur",
      "Date",
      "Date livraison",
      "Date livraison souhaitable",
      "REF BL N°",
      "Mode de Paiement",
    ];

    const tableRows = [];

    currentFactures.forEach((facture) => {
      const row = [
        facture.reference,
        facture.fournisseur?.raison_sociale || '',
        new Date(facture.date).toLocaleDateString('fr-FR'),
        new Date(facture.dateLivraison).toLocaleDateString('fr-FR'),
        new Date(facture.dateLivraisonSouhaitable).toLocaleDateString('fr-FR'),
        facture.ref_BL,
        facture.modePaiement,
      ];
      tableRows.push(row);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 10,
      theme: 'grid',
      styles: { fontSize: 8 },
    });

    doc.save('export_factures.pdf');
  };
  const handleExportXLS = () => {
    const rows = [];

    currentFactures.forEach((facture) => {
      rows.push({
        "N° Bon commande": facture.reference,
        "Fournisseur": facture.fournisseur?.raison_sociale || '',
        "Date": new Date(facture.date).toLocaleDateString('fr-FR'),
        "Date livraison": new Date(facture.dateLivraison).toLocaleDateString('fr-FR'),
        "Date livraison souhaitable": new Date(facture.dateLivraisonSouhaitable).toLocaleDateString('fr-FR'),
        "REF BL N°": facture.ref_BL,
        "Mode de Paiement": facture.modePaiement,
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BC");
    XLSX.writeFile(wb, "export_BC.xlsx");
  };
  const handlePrint = () => {
    const printWindow = window.open("", "", "width=900,height=700");

    printWindow.document.write(`
    <html>
      <head>
        <title>Impression des BC</title>
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <h2 style="text-align:center;">Liste des BC</h2>
        <table>
          <thead>
            <tr>
              <th>N° Bon commande</th>
              <th>Fournisseur</th>
              <th>Date</th>
              <th>Date livraison</th>
              <th>Date livraison souhaitable</th>
              <th>REF BL N°</th>
              <th>Mode de Paiement</th>
            </tr>
          </thead>
          <tbody>
            ${currentFactures
        .map((facture) => `
                <tr>
                  <td>${facture.reference}</td>
                  <td>${facture.fournisseur?.raison_sociale || ''}</td>
                  <td>${new Date(facture.date).toLocaleDateString('fr-FR')}</td>
                  <td>${new Date(facture.dateLivraison).toLocaleDateString('fr-FR')}</td>
                  <td>${new Date(facture.dateLivraisonSouhaitable).toLocaleDateString('fr-FR')}</td>
                  <td>${facture.ref_BL}</td>
                  <td>${facture.modePaiement}</td>
                </tr>
              `)
        .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);

    printWindow.document.close();
  };

  return (
    <ThemeProvider theme={createTheme()}>
      <Box sx={{ ...dynamicStyles }}>
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 6 }}>


          <h3 className="titreColore d-flex justify-content-between align-items-center"
            style={{
              width: '20%'
            }} >
            Liste Bon Commande
          </h3>

          <div className="search-container " style={{ width: "30%", position: 'absolute', right: '8%', marginTop: '-50px' }} role="search">
            <Search onSearch={handleSearch} type="search" />
          </div>
          <div style={{ width: "30%", position: 'absolute', right: '-22%', marginTop: '-50px' }}  >
            <FontAwesomeIcon
              style={{
                cursor: "pointer",
                color: "grey",
                fontSize: "1.8rem",
                marginLeft: "15px",
              }}
              onClick={handlePrint}
              icon={faPrint}
            />
            <FontAwesomeIcon
              style={{
                cursor: "pointer",
                color: "red",
                fontSize: "1.8rem",
                marginLeft: "15px",
              }}
              onClick={handleExportPDF}
              icon={faFilePdf}
            />
            <FontAwesomeIcon
              icon={faFileExcel}
              onClick={handleExportXLS}
              style={{
                cursor: "pointer",
                color: "green",
                fontSize: "1.8rem",
                marginLeft: "15px",
              }}
            />
          </div>

          <div className="">

            <div id="formContainerunique60" style={{
              ...formContainerStyle, overflowX: 'hidden', marginTop: "0px", maxHeight: `calc(100vh -  150px)`,
              height: `calc(100vh -  150px)`, width: "70%"
            }}>
              <Form className="col row" style={{ maxHeight: '800px', overflowY: 'auto', overflowX: "hidden", }} onSubmit={handleSubmit}>
                <Form.Label className="text-center">
                  <h4
                    style={{
                      fontSize: '20px',
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 'bold',
                      color: 'black',
                      borderBottom: '2px solid black',
                      paddingBottom: '5px',
                    }}
                  >
                    {editingFacture ? 'Modifier Bon Commande' : 'Ajouter un Bon Commande'}
                  </h4>
                </Form.Label>

                <div className="row " >
                  {/* Groupe de champs "N Facture" */}
                  <Form.Group className="col-sm-6 mb-3 d-flex align-items-center" style={{ marginLeft: '0px', marginBottom: "-10px" }}>
                    <Form.Label className="col-sm-4" style={{ marginRight: '-2%', }}>N Bon Commande</Form.Label>
                    <div className="col-sm-8">
                      <Form.Control
                        type="text"
                        placeholder="N Bon Commande"
                        name="reference"
                        value={formData.reference}
                        onChange={handleChange}
                        isInvalid={!!errors.reference}
                        style={{ padding: '8px', fontSize: '14px' }}
                      />
                      <Form.Control.Feedback type="invalid">{errors.reference}</Form.Control.Feedback>
                    </div>
                  </Form.Group>
                  <Form.Group className="col-sm-1 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                  </Form.Group>
                  <Form.Group className="col-sm-5 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                    <Form.Label className="col-sm-3" style={{ marginRight: '0px' }}>Date</Form.Label>
                    <div className="col-sm-9">
                      <Form.Control
                        type="date"
                        placeholder="Date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        isInvalid={!!errors.date}
                        style={{ padding: '8px', fontSize: '14px' }}
                      />
                      <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
                    </div>
                  </Form.Group>
                </div>

                <div className="row" style={{ display: 'flex', alignItems: 'center', marginLeft: '5%', marginBottom: '15px' }}>
                  {/* Un seul label pour les deux sélecteurs */}
                  <Form.Group className="col-sm-12" style={{ display: 'flex', alignItems: 'center' }}>
                    <Form.Label style={{ marginLeft: '-6.5%', flex: '1' }}>Fournisseur</Form.Label>

                    {/* Sélecteur Code Fournisseur */}
                    <div style={{ flex: '2', marginLeft: '-12%' }} className="col-sm-3">
                      <Autocomplete
                        options={clients.filter((cl) => cl.id_mere === null)}
                        getOptionLabel={(option) => option.CodeFournisseur || ""}
                        sx={{
                          width: '58%',
                          "& .MuiOutlinedInput-root": {
                            padding: '8px',
                            fontSize: '14px',
                          },
                        }}
                        isOptionEqualToValue={(option, value) => option.id === formData.client_id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Code Fournisseur"

                            variant="outlined"
                            error={!!errors.client_id}
                            helperText={errors.client_id}
                            sx={{
                              '& .MuiInputBase-root': {
                                height: '40px', // Height of the input box
                                fontSize: '0.85em', // Smaller font size

                              },

                            }}
                          />

                        )}
                        onChange={(event, selectedClient) => {
                          updateClientFields(selectedClient);
                          filterFactures(selectedClient.id);

                        }}
                        value={
                          formData.client_id
                            ? clients.find((cl) => cl.id === formData.client_id)
                            : null
                        }
                      />
                    </div>

                    {/* Sélecteur Raison Sociale */}
                    <div style={{ flex: '2', marginLeft: '-20%' }} className="col-sm-3">
                      <Autocomplete
                        options={clients.filter((cl) => cl.id_mere === null)}
                        getOptionLabel={(option) => option.raison_sociale || ""}
                        sx={{
                          width: '89%',
                          "& .MuiOutlinedInput-root": {
                            padding: '8px',
                            fontSize: '14px',
                          },
                        }}
                        isOptionEqualToValue={(option, value) => option.id === formData.client_id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Raison Sociale"

                            variant="outlined"
                            error={!!errors.client_id}
                            helperText={errors.client_id}
                            sx={{
                              '& .MuiInputBase-root': {
                                height: '40px', // Height of the input box
                                fontSize: '0.85em', // Smaller font size
                              },
                            }}
                          />
                        )}
                        onChange={(event, selectedClient) => {
                          updateClientFields(selectedClient);
                          filterFactures(selectedClient.id);

                        }}
                        value={
                          formData.client_id
                            ? clients.find((cl) => cl.id === formData.client_id)
                            : null
                        }
                      />
                    </div>
                  </Form.Group>
                </div>

                <div className="row" style={{ display: 'flex', alignItems: 'center', marginLeft: '5%', marginBottom: '15px' }}>
                  {/* Un seul label pour les deux sélecteurs */}
                  <Form.Group className="col-sm-12" style={{ display: 'flex', alignItems: 'center' }}>
                    <Form.Label style={{ marginLeft: '-6.5%', flex: '1' }}>Site </Form.Label>
                    <div style={{ flex: '2', marginLeft: '-12%' }} className="col-sm-2">
                      <Autocomplete
                        options={clients.filter((cl) => cl.id_mere === formData.client_id)}
                        getOptionLabel={(option) => option.CodeFournisseur || ""}
                        sx={{
                          width: '58%',
                          "& .MuiOutlinedInput-root": {
                            padding: '8px',
                            fontSize: '14px',

                          },
                        }}
                        isOptionEqualToValue={(option, value) => option.id === formData.siteClient_id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Code Fournisseur"

                            variant="outlined"
                            error={!!errors.siteClient_id}
                            helperText={errors.siteClient_id}
                            sx={{
                              '& .MuiInputBase-root': {
                                height: '40px', // Height of the input box
                                fontSize: '0.85em', // Smaller font size

                              },

                            }}
                          />

                        )}
                        onChange={(event, selectedClient) => {
                          updateClientFieldsSite(selectedClient);
                          filterFactures(selectedClient.id);

                        }}
                        value={
                          formData.siteClient_id
                            ? clients.find((cl) => cl.id === formData.siteClient_id)
                            : null
                        }
                      />
                    </div>
                    <div style={{ flex: '2', marginLeft: '-20%' }} className="col-sm-8">
                      <Autocomplete
                        options={clients.filter((cl) => cl.id_mere === formData.client_id)}
                        getOptionLabel={(option) => option.raison_sociale || ""}
                        sx={{
                          width: '89%',
                          "& .MuiOutlinedInput-root": {
                            padding: '8px',
                            fontSize: '14px',
                            marginLeft: '%'

                          },
                        }}
                        isOptionEqualToValue={(option, value) => option.id === formData.siteClient_id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Raison Sociale"

                            variant="outlined"
                            error={!!errors.siteClient_id}
                            helperText={errors.siteClient_id}
                            sx={{
                              '& .MuiInputBase-root': {
                                height: '40px', // Height of the input box
                                fontSize: '0.85em', // Smaller font size
                              },
                            }}
                          />
                        )}
                        onChange={(event, selectedClient) => {
                          updateClientFieldsSite(selectedClient);
                          filterFactures(selectedClient.id);

                        }}
                        value={
                          formData.siteClient_id
                            ? clients.find((cl) => cl.id === formData.siteClient_id)
                            : null
                        }
                      />
                    </div>
                  </Form.Group>
                </div>
                <div className="row">
                  <Form.Group className="col-sm-6 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                    <Form.Label className="col-sm-4" style={{ marginRight: '-2%', }}>Date Livraison souhaitable</Form.Label>
                    <div className="col-sm-8">
                      <Form.Control
                        type="date"
                        placeholder="date Livraison Souhaitable"
                        name="dateLivraisonSouhaitable"
                        value={formData.dateLivraisonSouhaitable}
                        onChange={handleChange}
                        style={{ padding: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="col-sm-1 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                  </Form.Group>
                  <Form.Group className="col-sm-5 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                    <Form.Label className="col-sm-3" style={{ marginRight: '0px' }}>Date Livraison</Form.Label>
                    <div className="col-sm-9">
                      <Form.Control
                        type="date"
                        placeholder="date Livraison"
                        name="dateLivraison"
                        value={formData.dateLivraison}
                        onChange={handleChange}
                        style={{ padding: '8px', fontSize: '14px' }}
                      />
                      <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
                    </div>
                  </Form.Group>
                </div>

                <div className="row">
                  <Form.Group className="col-sm-6 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                    <Form.Label className="col-sm-4" style={{ marginRight: '-2%', }}>Mode de paiement</Form.Label>
                    <div className="col-sm-8">
                      <Form.Select
                        type="text"
                        placeholder="Mode de paiement"
                        name="modePaiement"
                        value={formData.modePaiement}
                        onChange={handleChange}
                        isInvalid={!!errors.modePaiement}
                        style={{ padding: '8px', fontSize: '14px' }}
                      >
                        <option value="">Mode de paiement</option>
                        {modePaimant.map((mod) => (
                          <option key={mod.mode_paimants} value={mod.mode_paimants}>
                            {mod.mode_paimants}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                  </Form.Group>
                  <Form.Group className="col-sm-1 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                  </Form.Group>
                  <Form.Group className="col-sm-5 mb-3 d-flex align-items-center" style={{ marginLeft: '0px' }}>
                    <Form.Label className="col-sm-3" style={{ marginRight: '0px' }}>REF BL N</Form.Label>
                    <div className="col-sm-9">
                      <Form.Control
                        type="text"
                        placeholder="Ref bl n"
                        name="ref_BL"
                        value={formData.ref_BL}
                        onChange={handleChange}
                        isInvalid={!!errors.ref_BL}
                        style={{ padding: '8px', fontSize: '14px' }}
                      />
                    </div>
                  </Form.Group>
                </div>
                <a href="#" onClick={handleAddEmptyRow} style={{ marginLeft: '10px', marginTop: '20px', marginBottom: '0px' }}>
                  <Button className="btn btn-sm " variant="primary" >
                    <FontAwesomeIcon icon={faPlus} />
                  </Button>
                  <strong style={{
                    color: 'black'
                  }}>Ajouter Produit</strong>
                </a>
                <Form.Group controlId="selectedProduitTable" style={{ paddingLeft: '7px', paddingRight: '7px' }}>
                  <table className="table table-bordered" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th className="ColoretableForm" style={{ width: '15%' }}>Code Produit</th>
                        <th className="ColoretableForm" style={{ width: '25%' }}>Désignation</th>
                        <th className="ColoretableForm" style={{ width: '15%' }}>Unité </th>
                        <th className="ColoretableForm" style={{ width: '15%' }}>P.U/Unité</th>
                        <th className="ColoretableForm" style={{ width: '15%' }}>Quantité</th>
                        <th className="ColoretableForm" style={{ width: '15%' }}>Prix </th>
                        {/* <th className="ColoretableForm" style={{width:'90px'}}>TVA %</th> */}

                        <th className="ColoretableForm">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProductsData.map((productData, index) => (
                        <tr key={index}>
                          <td style={{ backgroundColor: 'white', width: '50px', padding: '0' }}>
                            <Autocomplete
                              options={produits.filter((prod) => {
                                const catIdExists = formData.cat_id ? prod?.categorie_id === Number(formData.cat_id) : true;
                                const suCatIdExists = formData.suCat_id ? prod?.suCat_id === Number(formData.suCat_id) : true;
                                return catIdExists && suCatIdExists;
                              })}
                              getOptionLabel={(option) => option.Code_produit}
                              renderOption={(props, option) => (
                                <li {...props} title={option.Code_produit}>
                                  {option.Code_produit}
                                </li>
                              )}
                              onChange={(event, selected) => {
                                const produit = produits.find((prod) => prod.id === selected?.id);
                                handleProductSelection(
                                  {
                                    id: productData.id,
                                    produit_id: selected?.id,
                                    Code_produit: produit?.Code_produit,
                                    designation: produit?.designation,
                                    calibre_id: produit?.calibre_id,
                                    calibre: produit?.calibre,
                                    quantite: productData?.quantite,
                                    prix_vente: productData?.prix_vente,
                                    TVA: productData?.TVA,
                                    unite: produit?.unite,
                                    type_quantite: produit?.type_quantite
                                  },
                                  index
                                );
                              }}
                              value={productData.produit_id ? produits.find((prod) => prod.id === productData.produit_id) : null}
                              renderInput={(params) => {
                                const hasError = !!errors[`produit_id_${index}`] || !productData.produit_id; // Check if there's an error or produit_id is missing
                                return (
                                  <TextField
                                    {...params}
                                    placeholder="Code ..."
                                    error={!!errors[`Produit_id_${index}`]}
                                    variant="outlined"
                                    sx={{
                                      '& .MuiInputBase-root': {
                                        height: '40px', // Height of the input box
                                        fontSize: '0.85em', // Smaller font size
                                        borderColor: hasError ? 'red' : 'inherit', // Apply red border if error or no produit_id
                                      },
                                    }}
                                  />
                                );
                              }}
                            />
                          </td>

                          <td style={{ backgroundColor: 'white', width: '50px', padding: '0' }}>
                            <Autocomplete
                              options={produits.filter((prod) => {
                                const catIdExists = formData.cat_id ? prod?.categorie_id === Number(formData.cat_id) : true;
                                const suCatIdExists = formData.suCat_id ? prod?.suCat_id === Number(formData.suCat_id) : true;
                                return catIdExists && suCatIdExists;
                              })}
                              getOptionLabel={(option) => option.designation}
                              renderOption={(props, option) => (
                                <li {...props} title={option.designation}>
                                  {option.designation}
                                </li>
                              )}
                              onChange={(event, selected) => {
                                const produit = produits.find((prod) => prod.id === selected?.id);
                                handleProductSelection(
                                  {
                                    id: productData.id,
                                    produit_id: selected?.id,
                                    Code_produit: produit?.Code_produit,
                                    designation: produit?.designation,
                                    calibre_id: produit?.calibre_id,
                                    calibre: produit?.calibre,
                                    quantite: productData?.quantite,
                                    prix_vente: productData?.prix_vente,
                                    TVA: productData?.TVA,
                                    unite: produit?.unite,
                                    type_quantite: produit?.type_quantite

                                  },
                                  index
                                );
                              }}
                              value={productData.produit_id ? produits.find((prod) => prod.id === productData.produit_id) : null}
                              renderInput={(params) => {
                                const hasError = !!errors[`produit_id_${index}`] || !productData.produit_id; // Check if there's an error or produit_id is missing
                                return (
                                  <TextField
                                    {...params}
                                    placeholder="Code ..."
                                    error={!!errors[`Produit_id_${index}`]}
                                    variant="outlined"
                                    sx={{
                                      '& .MuiInputBase-root': {
                                        height: '40px', // Height of the input box
                                        fontSize: '0.85em', // Smaller font size
                                        borderColor: hasError ? 'red' : 'inherit', // Apply red border if error or no produit_id
                                      },
                                    }}
                                  />
                                );
                              }}
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="text"
                              id={`NBREU_${index}_${productData.produit_id}`}
                              className=""
                              placeholder={productData.NBREU || ' Unité'}
                              value={modifiedNBREUValues[`${index}_${productData.produit_id}`] || ''}
                              onChange={(event) => handleInputChange(index, 'NBREU', event)}
                              readOnly={(productData.type_quantite === 'Litre' || productData.type_quantite === 'kg')} // Condition pour rendre le champ en lecture seule
                              style={{
                                backgroundColor: (productData.type_quantite === 'Litre' || productData.type_quantite === 'kg') ? '#ddd' : 'white',
                              }}
                            />
                          </td>

                          <td>
                            <Form.Control
                              type="text"
                              id={`PU_${index}_${productData.produit_id}`}
                              className=""
                              placeholder={productData.prixU || 'P.U'}
                              value={modifiedPUValues[`${index}_${productData.produit_id}`] || ''}
                              onChange={(event) => handleInputChange(index, 'PU', event)}
                              readOnly={(productData.type_quantite === 'Litre' || productData.type_quantite === 'kg')} // Condition pour rendre le champ en lecture seule
                              style={{
                                backgroundColor: (productData.type_quantite === 'Litre' || productData.type_quantite === 'kg') ? '#ddd' : 'white',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0' }}>
                            <Form.Control
                              type="text"
                              id={`quantite_${index}_${productData.produit_id}`}
                              className="quantiteInput"
                              placeholder={productData.quantite || 'Quantité'}
                              value={modifiedQuantiteValues[`${index}_${productData.produit_id}`]}
                              onChange={(event) => handleInputChange(index, 'quantite', event)}
                              // isInvalid={!!errors[`quantite_${index}_${productData.produit_id}`]} // Add isInvalid to apply red border
                              readOnly={productData.type_quantite === 'unite'} // Condition pour rendre le champ en lecture seule
                              style={{
                                backgroundColor: (productData.type_quantite === 'unite') ? '#ddd' : 'white',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0' }}>
                            <Form.Control
                              type="text"
                              id={`prix_unitaire_${index}_${productData.produit_id}`}
                              className=""
                              placeholder={productData.prix_vente || 'prix unitaire'}
                              value={modifiedPrixValues[`${index}_${productData.produit_id}`]}
                              onChange={(event) => handleInputChange(index, 'prix_vente', event)}
                              readOnly={productData.type_quantite === 'unite'} // Condition pour rendre le champ en lecture seule
                              style={{
                                backgroundColor: (productData.type_quantite === 'unite') ? '#ddd' : 'white',
                              }}
                            />
                          </td>
                         
                          <td>
                            <a href="#" onClick={() => handleDeleteProduct(index, productData.id)}
                            >

                              <FontAwesomeIcon color="red" icon={faTrash} />
                            </a>

                          </td>
                        </tr>
                      ))}
                      {errors.products && (
                        <tr>
                          <td colSpan="6" className="text-danger text-center">
                            {errors.products}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Form.Group>

                {/* Bouton de soumission */}
                <Form.Group className="mt-5 d-flex justify-content-center">
                  <Fab variant="extended" className="btn-sm Fab mb-2 mx-2" type="submit">
                    Valider
                  </Fab>
                  <Fab variant="extended" className="btn-sm FabAnnule mb-2 mx-2" onClick={closeForm}>
                    Annuler
                  </Fab>
                </Form.Group>
              </Form>
            </div>
            <div
              style={{
                ...tableContainerStyle,
                marginTop: '10px',
                padding: '0',
                backgroundColor: "#ffff", // Set background color
                border: "3px solid #ddd", // Add border to the table
                borderCollapse: "collapse", // Collapse borders
              }}>
              <AddButton
                onClick={() => handleShowFormButtonClick(false)}
                text="Ajouter Client"
                align="right"
                filtre={
                  <FilterToggleButton
                    showFilters={showFilters}
                    toggleFilters={toggleFilters}
                    align="right"
                  />
                }
              />
              <TableContainer
                selectedFactures={selectedFactures}
                showFilters={showFilters}
                selectedItems={selectedFactures}
                handleDeleteSelected={handleDeleteSelectedFactures}
                handleGenerateCombined={handleGenerateCombinedFacture}

                produitsFiltres={produitsFiltres}
                rowsPerPage={rowsPerPage}
                page={page}
                handleChangePage={handleChangePage}
                handleChangeRowsPerPage={handleChangeRowsPerPage}
                heightOffset={{ trueOffset: 270, falseOffset: 206 }} // Configurable
              >
                <table className="table_width  table table-bordered" style={{
                  marginTop: '-0px'
                }}>
                  <thead className="text-center table-secondary" style={{ position: 'sticky', top: -1, backgroundColor: '#ddd', zIndex: 999, padding: '10px', }}>
                    <tr>
                      <th className="tableHead widthDetails" ></th>

                      <th className="tableHead widthDetails">Détails</th>
                      <th className="tableHead">N° Bon commande</th>
                      <th className="tableHead">Fournisseur</th>

                      <th className="tableHead">Date</th>
                      <th className="tableHead">Date livraison</th>
                      <th className="tableHead">Date livraison souhaitable</th>


                      {/*<th>Total HT</th>*/}
                      {/*<th>TVA</th>*/}
                      {/*<th>Total TTC</th>*/}
                      <th className="tableHead">REF BL N°</th>
                      <th className="tableHead">Mode de Paiement</th>
                      <th className="tableHead">Génération</th>

                      <th className="tableHead">Action</th>
                    </tr>
                  </thead>
                  {/*<tbody className="text-center">*/}
                  {/*{filteredfactures*/}
                  {/*    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)*/}
                  {/*    .map((facture) => (*/}
                  <tbody className="text-center">
                    {produitsFiltres.slice(page * rowsPerPage - rowsPerPage, page * rowsPerPage)
                      .map((facture) => {
                        let totalTT = 0;
                        let totalTTC = 0;

                        facture.
                          ligne_bon_commande.map((lignefacture) => {
                            const produit = produits.find(
                              (prod) => prod.id === lignefacture.produit_id
                            );

                            // Calcul des totaux
                            totalTT += Number(lignefacture.tt);
                            totalTTC += Number(lignefacture.ttc);

                            return (
                              <tr key={lignefacture.id}>
                                <td>{produit?.code}</td>
                                <td>{produit ? produit.designation : ''}</td>
                                <td>{lignefacture.quantite}</td>
                                <td>{lignefacture.prix_vente} DH</td>
                                <td>{lignefacture.tt} DH</td>


                              </tr>
                            );
                          });
                        return (
                          <React.Fragment key={facture.id}>
                            <tr>
                              <td>
                                <input
                                  type="checkbox"
                                  onChange={() => handleSelectFacture(facture.id)}
                                  checked={selectedFactures.includes(facture.id)}
                                />
                              </td>
                              <td>
                                <div className="no-print ">
                                  <button
                                    className="btn btn-sm btn-light"
                                    onClick={() => handleShowLigneFactures(facture.id)}
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        expandedRows.includes(facture.id)
                                          ? faMinus
                                          : faPlus
                                      }
                                    />
                                  </button>
                                </div>
                              </td>
                              <td>{facture.reference}</td>
                              <td>{facture.fournisseur?.raison_sociale}
                              </td>
                              <td>{new Date(facture.date).toLocaleDateString('fr-FR')}</td>
                              <td>{new Date(facture.dateLivraison).toLocaleDateString('fr-FR')}</td>
                              <td>{new Date(facture.dateLivraisonSouhaitable).toLocaleDateString('fr-FR')}</td>




                              <td>{facture.ref_BL}</td>
                              <td>{facture.modePaiement}</td>
                              <td style={{ verticalAlign: "middle", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: '0' }}>
                                <Button
                                  className="btn btn-sm"
                                  variant="success"
                                  onClick={() => handleGenerateFacture(facture)}
                                  disabled={facture.nombre_g?.find((n) => n.type === 'FABCG')?.NumbreG > 0}
                                  style={{ marginRight: '5px' }}
                                >
                                  F
                                </Button>



                                <Button
                                  disabled={facture.nombre_g?.find((n) => n.type === 'BLABCG')?.NumbreG > 0}

                                  className="btn btn-sm " variant="dark" onClick={() => handleGenerateBonLivraison(facture)}>
                                  BL
                                </Button>

                              </td>
                              <td >
                                <div className="d-inline-flex text-center">
                                  <FontAwesomeIcon
                                    className="btn btn m-1"
                                    onClick={() => handleEdit(facture)}
                                    icon={faEdit}
                                    style={{
                                      color: "#007bff",
                                      cursor: "pointer",
                                    }}
                                  />
                                  <FontAwesomeIcon
                                    className="btn btn m-1"
                                    onClick={() => handleDelete(facture.id)} icon={faTrash}
                                    style={{
                                      color: "#ff0000",
                                      cursor: "pointer",
                                    }}
                                  />
                                  <Dropdown>
                                    <Dropdown.Toggle className="btn btn m-1" style={{
                                      backgroundColor: 'white', border: 'none',
                                      color: '#007bff'
                                    }} id="dropdown-basic">
                                      <FontAwesomeIcon icon={faFilePdf} />
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                      <Dropdown.Item onClick={() => handlePDF(facture.id, true)}>avec Entite</Dropdown.Item>
                                      <Dropdown.Item onClick={() => handlePDF(facture.id, false)}>sans Entite</Dropdown.Item>
                                    </Dropdown.Menu>
                                  </Dropdown>
                                  <Dropdown>
                                    <Dropdown.Toggle className="btn btn m-1" style={{
                                      backgroundColor: 'white', border: 'none',
                                      color: 'red'
                                    }} id="dropdown-basic">
                                      <FontAwesomeIcon icon={faPrint} />
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                      <Dropdown.Item onClick={() => print(facture.id, true)}>avec Entite</Dropdown.Item>
                                      <Dropdown.Item onClick={() => print(facture.id, false)}>sans Entite</Dropdown.Item>
                                    </Dropdown.Menu>
                                  </Dropdown>
                                </div>

                              </td>
                            </tr>
                            {expandedRows.includes(facture.id) && facture.
                              ligne_bon_commande && (
                                <tr style={{ padding: "0" }}>
                                  <td colSpan="13" style={{ padding: "0" }}>
                                    <div>
                                      <table className="table table-responsive table-bordered" style={{ backgroundColor: "#adb5bd", width: '100%', marginTop: '0px', marginBottom: '0px' }}
                                      >
                                        <thead>
                                          <tr>
                                            <th colSpan={7}>
                                              ligne de Bon Commande
                                            </th>
                                          </tr>
                                          <tr>
                                            <th className="ColoretableForm">Code Produit</th>
                                            <th className="ColoretableForm">designation</th>
                                            <th className="ColoretableForm">Unité</th>
                                            <th className="ColoretableForm">P.U </th>
                                            <th className="ColoretableForm">Quantite</th>
                                            <th className="ColoretableForm">Prix </th>
                                            <th className="ColoretableForm">Total Ht</th>

                                            {/*<th>Total HT </th>*/}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(() => {


                                            return facture.
                                              ligne_bon_commande.map((lignefacture) => {
                                                const produit = produits.find(
                                                  (prod) => prod.id === lignefacture.produit_id
                                                );

                                                // Calcul des totaux


                                                return (
                                                  <tr key={lignefacture.id}>
                                                    <td>{produit?.Code_produit}</td>
                                                    <td>{produit ? produit.designation : ''}</td>
                                                    <td>{lignefacture.NBREU || 0}</td>
                                                    <td>{parseFloat(lignefacture.prixU || 0).toFixed(2) || 0} DH</td>
                                                    <td>{lignefacture.quantite || 0}</td>
                                                    <td>{parseFloat(lignefacture.prix_vente || 0).toFixed(2) || 0} DH</td>
                                                    <td>{parseFloat(lignefacture.tt || 0).toFixed(2) || 0} DH</td>


                                                  </tr>
                                                );
                                              });
                                          })()}

                                          {/* Affichage du total tt et ttc à l'extérieur du map */}
                                          <tr>
                                            <td colSpan={5} className="ColoretableForm">
                                              Total HT
                                            </td>
                                            <td colSpan={2} style={{ backgroundColor: '#ddd' }}>
                                              {parseFloat(totalTT || 0).toFixed(2)} DH
                                            </td>
                                          </tr>
                                          <tr>
                                            <td colSpan={5} className="ColoretableForm">
                                              TVA
                                            </td>
                                            <td colSpan={2} style={{ backgroundColor: '#ddd' }}>
                                              {parseFloat(totalTTC - totalTT).toFixed(2)} DH
                                            </td>
                                          </tr>
                                          <tr>
                                            <td colSpan={5} className="ColoretableForm">
                                              Total TTC
                                            </td>
                                            <td colSpan={2} style={{ backgroundColor: '#ddd' }}>
                                              {parseFloat(totalTTC || 0).toFixed(2) || 0} DH
                                            </td>
                                          </tr>
                                        </tbody>


                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </React.Fragment>
                        )

                      })}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </div>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default BonCommandeAchat;