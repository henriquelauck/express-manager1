self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let dados = {
    titulo: "Express Manager",
    mensagem: "Você recebeu uma nova notificação.",
    url: "/",
    tag: "express-manager",
  };

  if (event.data) {
    try {
      const recebido = event.data.json();

      dados = {
        ...dados,
        ...recebido,
      };
    } catch {
      dados.mensagem = event.data.text();
    }
  }

  const opcoes = {
    body: dados.mensagem,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: dados.tag,
    renotify: true,
    data: {
      url: dados.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      dados.titulo || "Express Manager",
      opcoes
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destino = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientes) => {
        for (const cliente of clientes) {
          if ("focus" in cliente) {
            cliente.navigate(destino);
            return cliente.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(destino);
        }

        return undefined;
      })
  );
});