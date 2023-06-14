import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const app = admin.initializeApp();
const db = app.firestore();
const colDentistas = db.collection("dentistas");
const colEmergencias = db.collection("emergencias");
const colAvaliacoes = db.collection("avaliacoes");
const colDisputas = db.collection("disputas");

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
              foto: doc.data().foto,
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
      // const rejeitados: string[] = [];
      // const tokens: string[] = [];

      // eslint-disable-next-line guard-for-in
      /* for (const i in data.rej) {
        rejeitados.push(data.rej[i]);
      }*/

      functions.logger.info(data);
      // functions.logger.debug("REJEITADOS" + rejeitados);
      functions.logger.debug("ESCOLHIDO" + data.escolhido);
      const snapshot = await db.collection("dentistas").get();
      snapshot.forEach(async (doc) => {
        /* for (const i in rejeitados) {
          if (rejeitados[i] == doc.data().name) {
            tokens.push(doc.data().fcmToken);
          }
        }*/
        if (data.escolhido == doc.data().name) {
          const message = {
            data: {
              text: "aceita",
            },
          };
          functions.logger.debug("ACEITO" + doc.data().fcmToken);
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }
      });
      /* functions.logger.debug("REJEITADOS 2222" + tokens);
      const message = {
        tokens: tokens,
        data: {
          text: "rejeitada",
        },
      };
      functions.logger.info("TOKENS" + message.tokens);
      if (tokens.length == 0) {
        app.messaging().sendMulticast(message);
      }*/
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

export const enviaLocalizacaoDentista = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      const snapshot = await db.collection("emergencias").get();
      snapshot.forEach(async (doc) => {
        if (data.id == doc.id) {
          const message = {
            data: {
              text: "localizacao",
              lat: data.lat,
              long: data.long,
            },
          };
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }
      });
      result = {
        status: "SUCCESS",
        message: "Localizacao enviada com sucesso.",
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

export const enviaLocalizacaoSocorrista = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      const snapshot = await db.collection("dentistas").get();
      snapshot.forEach(async (doc) => {
        if (data.nome == doc.data().name) {
          const message = {
            data: {
              text: "localizacao",
              lat: data.lat,
              long: data.long,
            },
          };
          functions.logger.debug("entrou aqui" + doc.data().fcmToken);
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }
      });
      result = {
        status: "SUCCESS",
        message: "Localizacao enviada com sucesso.",
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

export const addAvaliacao = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      let aval = {};
      const snapshot = await db.collection("dentistas").get();
      snapshot.forEach(async (doc) => {
        if (data.uidDentista == doc.data().uid) {
          const message = {
            data: {
              text: "avaliacao",
              nome: data.nome,
              aval: data.aval.toString(),
              coment: data.coment,
              avalApp: data.avalApp.toString(),
              comentApp: data.comentApp,
            },
          };
          aval = {
            uidDentista: data.uidDentista,
            nome: data.nome,
            aval: data.aval,
            coment: data.coment,
            avalApp: data.avalApp,
            comentApp: data.comentApp,
          };
          functions.logger.debug("entrou aqui" + doc.data().fcmToken);
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }
      });
      const docRef = await colAvaliacoes.add(aval);
      result = {
        status: "SUCCESS",
        message: "Localizacao enviada com sucesso.",
        payload: JSON.parse(JSON.stringify({res: "sucesso " + docRef.id})),
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

export const finalizaEmergencia = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      const snapshot = await db.collection("emergencias").get();
      snapshot.forEach(async (doc) => {
        if (data.emerg == doc.id) {
          const message = {
            data: {
              text: "finalizada",
              uid: data.uid,
            },
          };
          functions.logger.debug("entrou aqui" + doc.data().fcmToken);
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }
      });
      result = {
        status: "SUCCESS",
        message: "Localizacao enviada com sucesso.",
        payload: JSON.parse(JSON.stringify({res: "sucesso "})),
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

export const getMedia = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      let aval = 0;
      let quant = 0;
      const snapshot = await db.collection("avaliacoes").get();
      snapshot.forEach(async (doc) => {
        if (data.uid == doc.data().uidDentista) {
          quant = quant + 1;
          aval = aval + doc.data().aval;
        }
      });
      functions.logger.info(aval);
      const media = aval/quant;
      const result = {
        status: "SUCCESS",
        message: media.toString(),
        payload: JSON.parse(JSON.stringify({res: media})),
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

export const addDenuncia = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;

    const disputa = {
      uidDentista: data.uidDentista,
      nome: data.nome,
      coment: data.coment,
      motivo: data.motivo,
    };
    functions.logger.debug(disputa);
    try {
      const docRef = await colDisputas.add(disputa);
      functions.logger.debug(docRef.id);
      result = {
        status: "SUCCESS",
        message: "Disputa enviada com sucesso.",
        payload: JSON.parse(JSON.stringify({res: "sucesso " + docRef.id})),
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

export const dentistaLigou = functions
  .region("southamerica-east1")
  .https.onCall(async (data, context) => {
    let result: CallableResponse;
    try {
      const snapshot = await db.collection("emergencias").get();
      snapshot.forEach(async (doc) => {
        if (data.emerg == doc.id) {
          const message = {
            data: {
              text: "ligacao",
            },
          };
          functions.logger.debug("entrou aqui" + doc.data().fcmToken);
          admin.messaging().sendToDevice(doc.data().fcmToken, message);
        }
      });
      result = {
        status: "SUCCESS",
        message: "Localizacao enviada com sucesso.",
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

export const rejeitaDentista = functions
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

      // eslint-disable-next-line max-len
      tokens.push("eRBmxGJRQOOfpBkayrPWXB:APA91bGN3ziyu_yFEWimLhUVuyaHY_6gqOHSJnZF3xO2Lv0e4Qll8zpqxUaIv1XsXE8DgusBKJdGD0BBEdRCcJ2eq6IMPB2ns2bCfCz66J6Ta37pb8cDZOyxv04Q8SQNTKQaHF-wkISN");

      functions.logger.info(data);
      functions.logger.debug("REJEITADOS" + rejeitados);
      const snapshot = await db.collection("dentistas").get();
      snapshot.forEach(async (doc) => {
        for (const i in rejeitados) {
          if (rejeitados[i] == doc.data().name) {
            tokens.push(doc.data().fcmToken);
          }
        }
      });
      functions.logger.debug("REJEITADOS 2222" + tokens);
      const message = {
        tokens: tokens,
        data: {
          text: "rejeitada",
        },
      };
      functions.logger.info("TOKENS" + message.tokens);
      if (tokens.length == 0) {
        app.messaging().sendMulticast(message);
      }
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
