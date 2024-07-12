import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { MessageData } from './message.data';
import { ChatMessageModel, ChatMessageSchema } from './models/message.model';

import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { getTestConfiguration } from '../configuration/configuration-manager.utils';
import { TagsDto } from './models/message.dto';

const id = new ObjectID('5fe0cce861c8ea54018385af');
const conversationId = new ObjectID();
const senderId = new ObjectID('5fe0cce861c8ea54018385af');
const sender2Id = new ObjectID('5fe0cce861c8ea54018385aa');
const sender3Id = new ObjectID('5fe0cce861c8ea54018385ab');

class TestMessageData extends MessageData {
  async deleteMany() {
    await this.chatMessageModel.deleteMany();
  }
}

describe('MessageData', () => {
  let messageData: TestMessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          useFactory: () => {
            const databaseConfig = getTestConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [TestMessageData],
    }).compile();

    messageData = module.get<TestMessageData>(TestMessageData);
  });

  beforeEach(async () => {
    messageData.deleteMany();
  });

  afterEach(async () => {
    messageData.deleteMany();
  });

  it('should be defined', () => {
    expect(messageData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(messageData.create).toBeDefined();
    });

    it('successfully creates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      expect(message).toMatchObject({
        likes: [],
        resolved: false,
        deleted: false,
        reactions: [],
        text: 'Hello world',
        senderId: senderId,
        conversationId: conversationId,
        conversation: { id: conversationId.toHexString() },
        likesCount: 0,
        sender: { id: senderId.toHexString() },
      });
    });
  });

  describe('get', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const gotMessage = await messageData.getMessage(
        sentMessage.id.toHexString(),
      );

      expect(gotMessage).toMatchObject(sentMessage);
    });
  });

  describe('delete', () => {
    it('successfully marks a message as deleted', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to delete' },
        senderId,
      );

      // Make sure that it started off as not deleted
      expect(message.deleted).toEqual(false);

      const deletedMessage = await messageData.delete(new ObjectID(message.id));
      expect(deletedMessage.deleted).toEqual(true);

      // And that is it now deleted
      const retrievedMessage = await messageData.getMessage(
        message.id.toHexString(),
      );
      expect(retrievedMessage.deleted).toEqual(true);
    });
  });

  describe('addTagsToMessage', () => {
    it('should add tags to a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to tag' },
        senderId,
      );

      // Make sure that tags started off as an empty array
      expect(message.tags).toEqual([]);

      const tagData: TagsDto = {
        messageId: message.id,
        conversationId: conversationId,
        tags: ['tag1', 'tag2'],
      };

      const taggedMessage = await messageData.addTagsToMessage(tagData);
      expect(taggedMessage.tags).toContain('tag1');
      expect(taggedMessage.tags).toContain('tag2');
    });
  });

  describe('updateTagsOnMessage', () => {
    it('should update tags on a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to tag' },
        senderId,
      );

      // I added the initial tagData to message
      const tagData: TagsDto = {
        messageId: message.id,
        conversationId: conversationId,
        tags: ['tag1', 'tag2'],
      };
      const taggedMessage = await messageData.addTagsToMessage(tagData);
      expect(taggedMessage.tags).toContain('tag1');
      expect(taggedMessage.tags).toContain('tag2');

      // Update message with new tags
      const tagsUpdate: TagsDto = {
        messageId: message.id,
        conversationId: conversationId,
        tags: ['tag3', 'tag4'],
      };
      const messageWithUpdatedTags = await messageData.updateTagsOnMessage(
        tagsUpdate,
      );
      // Check that the new tags are present
      expect(messageWithUpdatedTags.tags).toContain('tag3');
      expect(messageWithUpdatedTags.tags).toContain('tag4');

      // Check that the old tags are not present
      expect(messageWithUpdatedTags.tags).not.toContain('tag1');
      expect(messageWithUpdatedTags.tags).not.toContain('tag2');
    });
  });

  describe('searchMessagesByTags', () => {
    it('should search messsages by the tags on the message', async () => {
      // Creating series of messages with varying tags
      const firstConversationId = new ObjectID();
      const firstMessage = await messageData.create(
        { conversationId: firstConversationId, text: 'First message to tag' },
        senderId,
      );

      const secondConversationId = new ObjectID();
      const secondMessage = await messageData.create(
        { conversationId: secondConversationId, text: 'Second message to tag' },
        senderId,
      );

      const thirdConversationId = new ObjectID();
      const thirdMessage = await messageData.create(
        { conversationId: thirdConversationId, text: 'Third message to tag' },
        senderId,
      );

      const fourthConversationId = new ObjectID();
      const fourthMessage = await messageData.create(
        { conversationId: fourthConversationId, text: 'Fourth message to tag' },
        senderId,
      );

      const firstTagData: TagsDto = {
        messageId: firstMessage.id,
        conversationId: firstConversationId,
        tags: ['social', 'leader'],
      };

      const secondTagData: TagsDto = {
        messageId: secondMessage.id,
        conversationId: secondConversationId,
        tags: ['social'],
      };

      const thirdTagData: TagsDto = {
        messageId: thirdMessage.id,
        conversationId: thirdConversationId,
        tags: ['leader'],
      };

      const fourthTagData: TagsDto = {
        messageId: fourthMessage.id,
        conversationId: fourthConversationId,
        tags: ['social'],
      };

      // Adding tags to messages
      await messageData.addTagsToMessage(firstTagData);
      await messageData.addTagsToMessage(secondTagData);
      await messageData.addTagsToMessage(thirdTagData);
      await messageData.addTagsToMessage(fourthTagData);

      // Trying to find messages using tags
      const messagesWithSocialTag = await messageData.searchMessagesByTags(['social']);
      const messagesWithLeaderTag = await messageData.searchMessagesByTags(['leader']);

      // Iteratively run checks for the presence of expected tag text
      messagesWithSocialTag.forEach(message => {
        expect(message.tags).toContain('social');
      });
      messagesWithLeaderTag.forEach(message => {
        expect(message.tags).toContain('leader');
      });
    });
  });
});
