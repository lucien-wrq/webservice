const soap = require("soap");
const fs = require("node:fs");
const http = require("http");

const postgres = require("postgres");
const sql = postgres({ db: "mydb", user: "user", password: "password", port: 5435 });

// Fonction utilitaire pour générer une erreur SOAP propre
const throwSoapFault = (message, code = "soap:Sender", statusCode = 400) => {
  throw {
    Fault: {
      Code: {
        Value: code,
        Subcode: { value: "rpc:BadArguments" },
      },
      Reason: { Text: message },
      statusCode: statusCode,
    },
  };
};

const service = {
  ProductsService: {
    ProductsPort: {

        CreateProduct: async function ({ name, about, price }, callback) {
        if (!name || !about || !price) {
          throwSoapFault("Arguments manquants : name, about et price sont requis.");
        }

        const [product] = await sql`
          INSERT INTO products (name, about, price)
          VALUES (${name}, ${about}, ${price})
          RETURNING *
        `;
        callback(product);
      },

      PatchProduct: async function (args, callback) {
        const { id, name, about, price } = args;

        // Validation de l'ID (obligatoire)
        if (!id) {
          throwSoapFault("L'identifiant (id) est obligatoire pour la mise à jour.");
        }

        // On vérifie qu'il y a au moins un champ à modifier
        if (!name && !about && !price) {
          throwSoapFault("Aucune donnée fournie pour la mise à jour (name, about ou price).");
        }

        try {
          // Construction de la mise à jour dynamique avec le client 'postgres'
          const updateData = {};
          if (name) updateData.name = name;
          if (about) updateData.about = about;
          if (price) updateData.price = price;

          const result = await sql`
            UPDATE products 
            SET ${sql(updateData)} 
            WHERE id = ${id}
            RETURNING id
          `;

          if (result.length === 0) {
            throwSoapFault(`Produit avec l'ID ${id} introuvable.`, "soap:Receiver", 404);
          }

          callback({ success: true, message: "Produit mis à jour avec succès." });
        } catch (err) {
          if (err.Fault) throw err;
          throwSoapFault("Erreur lors de la mise à jour : " + err.message, "soap:Receiver", 500);
        }
      },

      DeleteProduct: async function ({ id }, callback) {
        if (!id) {
          throwSoapFault("L'identifiant (id) est obligatoire pour la suppression.");
        }

        try {
          const result = await sql`
            DELETE FROM products 
            WHERE id = ${id}
            RETURNING id
          `;

          if (result.length === 0) {
            throwSoapFault(`Impossible de supprimer : produit avec l'ID ${id} introuvable.`, "soap:Receiver", 404);
          }

          callback({ success: true, message: "Produit supprimé avec succès." });
        } catch (err) {
          if (err.Fault) throw err;
          throwSoapFault("Erreur lors de la suppression : " + err.message, "soap:Receiver", 500);
        }
      },
    },
  },
};

const server = http.createServer(function (request, response) {
  response.end("404: Not Found: " + request.url);
});

server.listen(8000);

const xml = fs.readFileSync("productsService.wsdl", "utf8");
soap.listen(server, "/products", service, xml, function () {
  console.log("SOAP server running at http://localhost:8000/products?wsdl");
});