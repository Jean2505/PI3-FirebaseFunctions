import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const app = admin.initializeApp();
const db = app.firestore();
const colDentistas = db.collection("dentistas");
const colEmergencias = db.collection("emergencias");

interface CallableResponse{
    status: string,
    message: string,
    payload: JSON
  }

export const addDentista = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;

    const dentista = {
      uid: data.uid,
      fcmToken: data.fcmToken,
      status: data.status,
      name: data.nome,
      telefone: data.tel,
      email: data.email,
      end1: data.end1,
      end2: data.end2,
      end3: data.end3,
      cv: data.cv,
      foto: data.foto,
    };
    try {
      const docRef = await colDentistas.add(dentista);
      result = {
        status: "SUCCESS",
        message: "Dentista registrado com sucesso.",
        payload: JSON.parse(JSON.stringify({docId: docRef.id.toString()})),
      };

      return result;
    } catch (e) {
      result = {
        status: "ERROR",
        message: "Erro",
        payload: JSON.parse(JSON.stringify({docId: null})),
      };
      return result;
    }
  });

export const trgEmergencia = functions
  .region("southamerica-east1")
  .firestore
  .document("emergencias/{docId}")
  .onCreate(async (snap, context) => {
    const tokens: string[] = [];
    const snapshot = await db.collection("dentistas").get();
    snapshot.forEach((doc) => {
      tokens.push(doc.data().fcmToken);
    });
    functions.logger.info(tokens);

    const message = {
      tokens: tokens,
      data: {
        text: "nova emergencia",
        nome: snap.data().nome,
        telefone: snap.data().telefone,
        Foto1: snap.data().Foto1,
        Foto2: snap.data().Foto2,
        Foto3: snap.data().Foto3,
        emergencia: snap.id,
        dataHora: snap.data().dataHora,
      },
    };
    functions.logger.info(message);
    app.messaging().sendMulticast(message);
  });

export const addEmergencia = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;

    functions.logger.debug(data.nome);
    functions.logger.debug(data.tel);

    const emergencia = {
      uid: data.uid,
      fcmToken: data.fcmToken,
      status: "nova",
      nome: data.nome,
      telefone: data.tel,
      Foto1: data.Foto1,
      Foto2: data.Foto2,
      Foto3: data.Foto3,
      dataHora: data.dataHora,
    };
    try {
      const docRef = await colEmergencias.add(emergencia);
      result = {
        status: "SUCCESS",
        message: "Emergencia registrada com sucesso.",
        payload: JSON.parse(JSON.stringify({docId: docRef.id.toString()})),
      };

      return result;
    } catch (e) {
      result = {
        status: "ERROR",
        message: "Erro",
        payload: JSON.parse(JSON.stringify({docId: null})),
      };
      functions.logger.debug(result);
      return result;
    }
  });

export const trgAceite = functions
  .region("southamerica-east1")
  .firestore
  .document("aceites/{docId}")
  .onCreate(async (snap, context) => {
    if (snap.data().status == "aceita") {
      const snapshot = await db.collection("dentistas").get();
      snapshot.forEach(async (doc) => {
        if (doc.data().uid == snap.data().profissional) {
          const dentista = {
            nome: doc.data().name,
            telefone: doc.data().telefone,
            end1: doc.data().end1,
            end2: doc.data().end2,
            end3: doc.data().end3,
            cv: doc.data().cv,
          };
          functions.logger.info(dentista);

          const emerg = await db.collection("emergencias")
            .doc(snap.data().emergencia).get();
          functions.logger.debug(emerg.data());
          const message = {
            data: {
              text: "aceita",
              nome: doc.data().name,
              telefone: doc.data().telefone,
              end1: doc.data().end1,
              end2: doc.data().end2,
              end3: doc.data().end3,
              cv: doc.data().cv,
            },
          };
          functions.logger.info(message);
          admin.messaging().sendToDevice(emerg?.data()?.fcmToken, message);
          // app.messaging().sendToDevice(emerg?.data()?.fcmToken, message);
          functions.logger.debug("mensagem enviada");
        }
      });
    }
  });

export const escolheDentista = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      const rejeitados: string[] = [];
      const tokens: string[] = [];

      // eslint-disable-next-line guard-for-in
      for (const i in data.rej) {
        rejeitados.push(data.rej[i]);
      }
      functions.logger.info(data);
      functions.logger.debug("REJEITADOS" + rejeitados);
      functions.logger.debug("ESCOLHIDO" + data.escolhido);
      const snapshot = await db.collection("dentistas").get();
      snapshot.forEach(async (doc) => {
        for (const i in rejeitados) {
          if (rejeitados[i] == doc.data().name) {
            tokens.push(doc.data().fcmToken);
          } else if (data.escolhido == doc.data().name) {
            const message = {
              data: {
                text: "aceita",
              },
            };
            functions.logger.debug("ACEITO" + doc.data().fcmToken);
            admin.messaging().sendToDevice(doc.data().fcmToken, message);
          }
        }
        /* if (rejeitados.find(doc.data().name) != undefined) {
          tokens.push(doc.data().fcmToken);
        } else if (data.escolhido == doc.data().name) {
          const message = {
            data: {
              text: "aceita",
            },
          };
          functions.logger.debug("ACEITO" + doc.data().fcmToken);
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }*/
      });
      functions.logger.debug("REJEITADOS 2222" + tokens);
      const message = {
        tokens: tokens,
        data: {
          text: "rejeitada",
        },
      };
      functions.logger.info("TOKENS" + message.tokens);
      app.messaging().sendMulticast(message);
      result = {
        status: "SUCCESS",
        message: "Dentista registrado com sucesso.",
        payload: JSON.parse(JSON.stringify({res: "sucesso"})),
      };
      return result;
    } catch (e) {
      result = {
        status: "ERROR",
        message: "Erro",
        payload: JSON.parse(JSON.stringify({res: "fracasso"})),
      };
      return result;
    }
  });
