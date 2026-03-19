const soap = require("soap");
const url = "http://localhost:8000/products?wsdl";

soap.createClient(url, {}, function (err, client) {
  if (err) {
    console.error("Erreur lors de la création du client SOAP:", err);
    return;
  }

  // 1. D'abord, on crée un produit pour obtenir un ID
  client.CreateProduct({ name: "Produit Test", about: "Initial", price: 100 }, function (err, createRes) {
    if (err) return console.error("Erreur Create:", err.body || err);
    
    const productId = createRes.id;
    console.log("--- Produit Créé --- ID:", productId);

    // 2. Test de PatchProduct : On ne change QUE le prix
    client.PatchProduct({ id: productId, price: 150.50 }, function (err, patchRes) {
      if (err) {
        console.error("Erreur Patch:", err.body || err);
      } else {
        console.log("--- Patch Réussi ---", patchRes.message);
      }

      // 3. Test de DeleteProduct
      client.DeleteProduct({ id: productId }, function (err, deleteRes) {
        if (err) {
          console.error("Erreur Delete:", err.body || err);
        } else {
          console.log("--- Suppression Réussie ---", deleteRes.message);
        }

        // 4. Test d'erreur (Supprimer un ID qui n'existe plus)
        client.DeleteProduct({ id: productId }, function (err, fault) {
          console.log("--- Test Erreur (ID inexistant) ---");
          if (err) {
            
            console.log("Succès du test d'erreur :", err.root.Envelope.Body.Fault.Reason.Text);
          }
        });
      });
    });
  });
});